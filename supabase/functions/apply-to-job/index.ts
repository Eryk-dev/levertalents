// apply-to-job
// Endpoint público chamado por /vagas/:id. Recebe multipart/form-data com dados
// do candidato + CV. Cria (ou reutiliza) Candidate, faz upload do CV no bucket
// `hiring`, e cria Application em stage `recebido`. Rate-limit por IP.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ipWindow = new Map<string, { windowStart: number; count: number }>();

function rateLimitIp(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 5;
  const existing = ipWindow.get(ip);
  if (!existing || now - existing.windowStart > windowMs) {
    ipWindow.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  existing.count += 1;
  return existing.count <= limit;
}

const MAX_CV_BYTES = 8 * 1024 * 1024;
const ALLOWED_CV_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (!rateLimitIp(ip)) {
    return jsonResponse(429, { error: "Muitas tentativas. Tente novamente mais tarde." });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonResponse(400, { error: "Formulário inválido." });
  }

  const jobOpeningId = form.get("job_opening_id");
  const fullName = form.get("full_name");
  const email = form.get("email");
  const phone = form.get("phone");
  const linkedin = form.get("linkedin");
  const honeypot = form.get("hp");
  const consent = form.get("consent");
  const cvFile = form.get("cv");

  if (honeypot) return jsonResponse(400, { error: "Requisição inválida." });
  if (typeof jobOpeningId !== "string" || !jobOpeningId) {
    return jsonResponse(400, { error: "job_opening_id é obrigatório." });
  }
  if (typeof fullName !== "string" || fullName.trim().length < 2) {
    return jsonResponse(400, { error: "Nome completo é obrigatório." });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(400, { error: "E-mail inválido." });
  }
  if (consent !== "true") {
    return jsonResponse(400, { error: "É necessário aceitar os termos." });
  }
  if (!(cvFile instanceof File)) {
    return jsonResponse(400, { error: "Currículo é obrigatório." });
  }
  if (cvFile.size === 0) {
    return jsonResponse(400, { error: "Arquivo de currículo vazio." });
  }
  if (cvFile.size > MAX_CV_BYTES) {
    return jsonResponse(400, { error: "Currículo maior que 8MB." });
  }
  if (!ALLOWED_CV_MIMES.includes(cvFile.type)) {
    return jsonResponse(400, { error: "Formato de currículo inválido (PDF ou DOC/DOCX)." });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: job, error: jobErr } = await admin
    .from("job_openings")
    .select("id, status, confidential, closed_at, company_id, cultural_fit_survey_id")
    .eq("id", jobOpeningId)
    .maybeSingle();
  if (jobErr) return jsonResponse(500, { error: jobErr.message });
  if (!job) return jsonResponse(404, { error: "Vaga não encontrada." });

  const isPublic =
    !job.confidential &&
    !job.closed_at &&
    ["publicada", "em_triagem", "pronta_para_publicar"].includes(job.status);
  if (!isPublic) {
    return jsonResponse(410, { error: "Esta vaga não está mais recebendo candidaturas." });
  }

  let parsedFit: Record<string, unknown> | null = null;
  if (job.cultural_fit_survey_id) {
    const raw = form.get("fit_responses");
    if (typeof raw !== "string" || !raw.trim()) {
      return jsonResponse(400, { error: "Respostas de fit cultural são obrigatórias." });
    }
    try {
      parsedFit = JSON.parse(raw);
    } catch {
      return jsonResponse(400, { error: "Respostas de fit em formato inválido." });
    }
    if (!parsedFit || typeof parsedFit !== "object") {
      return jsonResponse(400, { error: "Respostas de fit em formato inválido." });
    }

    const { data: questions, error: qErr } = await admin
      .from("cultural_fit_questions")
      .select("id, kind, scale_min, scale_max")
      .eq("survey_id", job.cultural_fit_survey_id);
    if (qErr) return jsonResponse(500, { error: qErr.message });

    for (const q of questions ?? []) {
      const ans = (parsedFit as Record<string, unknown>)[q.id];
      if (ans === undefined || ans === null || ans === "") {
        return jsonResponse(400, { error: `Responda todas as perguntas do fit (${q.id}).` });
      }
      if (q.kind === "scale" && typeof ans === "number") {
        if (q.scale_min !== null && ans < q.scale_min) return jsonResponse(400, { error: "Escala fora dos limites." });
        if (q.scale_max !== null && ans > q.scale_max) return jsonResponse(400, { error: "Escala fora dos limites." });
      }
    }
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Upsert candidate por email (citext).
  const { data: existing, error: findErr } = await admin
    .from("candidates")
    .select("id")
    .ilike("email", normalizedEmail)
    .maybeSingle();
  if (findErr) return jsonResponse(500, { error: findErr.message });

  let candidateId = existing?.id as string | undefined;

  if (!candidateId) {
    const { data: newCand, error: insertCandErr } = await admin
      .from("candidates")
      .insert({
        full_name: fullName.trim(),
        email: normalizedEmail,
        phone: typeof phone === "string" ? phone.trim() : null,
        source: typeof linkedin === "string" && linkedin.trim() ? linkedin.trim() : "pagina_publica",
      })
      .select("id")
      .single();
    if (insertCandErr) return jsonResponse(500, { error: insertCandErr.message });
    candidateId = newCand.id as string;
  } else {
    // Atualiza dados se candidato já existia.
    await admin
      .from("candidates")
      .update({
        full_name: fullName.trim(),
        phone: typeof phone === "string" ? phone.trim() : undefined,
      })
      .eq("id", candidateId);
  }

  // Upload do CV.
  const ext = cvFile.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const cvPath = `${job.company_id}/${jobOpeningId}/${candidateId}-${Date.now()}.${ext}`;
  const cvBytes = new Uint8Array(await cvFile.arrayBuffer());
  const { error: uploadErr } = await admin.storage
    .from("hiring")
    .upload(cvPath, cvBytes, {
      contentType: cvFile.type,
      upsert: false,
    });
  if (uploadErr) return jsonResponse(500, { error: `Falha no upload: ${uploadErr.message}` });

  await admin.from("candidates").update({ cv_storage_path: cvPath }).eq("id", candidateId);

  // Evita duplicação: mesma vaga+candidato.
  const { data: existingApp } = await admin
    .from("applications")
    .select("id, stage")
    .eq("candidate_id", candidateId)
    .eq("job_opening_id", jobOpeningId)
    .maybeSingle();

  if (existingApp) {
    return jsonResponse(200, {
      application_id: existingApp.id,
      candidate_id: candidateId,
      duplicated: true,
      message: "Você já se candidatou a essa vaga.",
    });
  }

  const stage = parsedFit ? "fit_recebido" : "recebido";

  const { data: newApp, error: appErr } = await admin
    .from("applications")
    .insert({
      candidate_id: candidateId,
      job_opening_id: jobOpeningId,
      stage,
      notes: linkedin && typeof linkedin === "string" ? `LinkedIn: ${linkedin}` : null,
    })
    .select("id")
    .single();
  if (appErr) return jsonResponse(500, { error: appErr.message });

  if (parsedFit && job.cultural_fit_survey_id) {
    const { error: fitErr } = await admin.from("cultural_fit_responses").insert({
      application_id: newApp.id,
      survey_id: job.cultural_fit_survey_id,
      payload: parsedFit,
    });
    if (fitErr) {
      return jsonResponse(200, {
        application_id: newApp.id,
        candidate_id: candidateId,
        duplicated: false,
        fit_saved: false,
        fit_error: fitErr.message,
      });
    }
  }

  return jsonResponse(200, {
    application_id: newApp.id,
    candidate_id: candidateId,
    duplicated: false,
    fit_saved: !!parsedFit,
  });
});

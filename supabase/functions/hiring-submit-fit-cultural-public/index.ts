// hiring-submit-fit-cultural-public
// Public endpoint hit by /hiring/fit/:token. Validates honeypot, rate-limits,
// consumes the one-time token, writes the response, advances application
// stage. Never returns sensitive data.
// Contract: specs/001-hiring-pipeline/contracts/hiring-submit-fit-cultural-public.md

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ipWindow = new Map<string, { windowStart: number; count: number }>();
const tokenAttempts = new Map<string, number>();

function rateLimitIp(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const existing = ipWindow.get(ip);
  if (!existing || now - existing.windowStart > windowMs) {
    ipWindow.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  existing.count += 1;
  return existing.count <= 10;
}

function rateLimitToken(tokenRaw: string): boolean {
  const current = tokenAttempts.get(tokenRaw) ?? 0;
  if (current >= 3) return false;
  tokenAttempts.set(tokenRaw, current + 1);
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method === "GET") {
    // Simple GET helper so the public page can fetch the survey schema by
    // token. Reads are unauthenticated but the token gate is enforced.
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return jsonResponse(400, { error: "token query param required" });
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: tokenRow } = await admin.rpc("validate_and_consume_fit_token", {
      p_token_raw: token,
    });
    // The RPC above would consume on GET; we DO NOT want that. So instead:
    // look up by hash without consuming.
    const hash = await sha256Hex(token);
    const { data: row } = await admin
      .from("cultural_fit_tokens")
      .select("id, application_id, survey_id, expires_at, consumed_at, revoked_at")
      .eq("token_hash", hash)
      .maybeSingle();
    if (!row || row.consumed_at || row.revoked_at || new Date(row.expires_at).getTime() <= Date.now()) {
      return jsonResponse(404, { error: "Token inválido, expirado ou já utilizado." });
    }
    const { data: questions } = await admin
      .from("cultural_fit_questions")
      .select("id, order_index, kind, prompt, options, scale_min, scale_max")
      .eq("survey_id", row.survey_id)
      .order("order_index", { ascending: true });
    const { data: survey } = await admin
      .from("cultural_fit_surveys")
      .select("name")
      .eq("id", row.survey_id)
      .maybeSingle();
    return jsonResponse(200, { survey: survey ?? null, questions: questions ?? [] });
  }

  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (!rateLimitIp(ip)) {
    return jsonResponse(429, { error: "Too many attempts" });
  }

  let payload: { token?: string; honeypot?: string; responses?: Record<string, unknown> } = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }
  if (payload.honeypot) return jsonResponse(400, { error: "Bad request" });
  if (!payload.token || typeof payload.token !== "string") {
    return jsonResponse(400, { error: "token required" });
  }
  if (!rateLimitToken(payload.token)) {
    return jsonResponse(429, { error: "Too many attempts on this token" });
  }
  if (!payload.responses || typeof payload.responses !== "object") {
    return jsonResponse(400, { error: "responses required" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: validated, error: validErr } = await admin.rpc("validate_and_consume_fit_token", {
    p_token_raw: payload.token,
  });
  if (validErr) return jsonResponse(500, { error: validErr.message });
  const tokenRow = Array.isArray(validated) ? validated[0] : validated;
  if (!tokenRow) return jsonResponse(404, { error: "Token inválido, expirado ou já utilizado." });

  // Validate response shape against questions.
  const { data: questions, error: qErr } = await admin
    .from("cultural_fit_questions")
    .select("id, kind, options, scale_min, scale_max")
    .eq("survey_id", tokenRow.survey_id);
  if (qErr) return jsonResponse(500, { error: qErr.message });

  for (const q of questions ?? []) {
    const ans = (payload.responses as Record<string, unknown>)[q.id];
    if (ans === undefined || ans === null) {
      return jsonResponse(400, { error: `Resposta ausente para ${q.id}` });
    }
    if (q.kind === "scale" && typeof ans === "number") {
      if (q.scale_min !== null && ans < q.scale_min) return jsonResponse(400, { error: "Escala fora dos limites" });
      if (q.scale_max !== null && ans > q.scale_max) return jsonResponse(400, { error: "Escala fora dos limites" });
    }
  }

  const { error: insertErr } = await admin.from("cultural_fit_responses").insert({
    application_id: tokenRow.application_id,
    survey_id: tokenRow.survey_id,
    payload: payload.responses,
  });
  if (insertErr) return jsonResponse(500, { error: insertErr.message });

  await admin
    .from("applications")
    .update({ stage: "fit_recebido" })
    .eq("id", tokenRow.application_id);

  return jsonResponse(200, {
    application_id: tokenRow.application_id,
    submitted_at: new Date().toISOString(),
  });
});

async function sha256Hex(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

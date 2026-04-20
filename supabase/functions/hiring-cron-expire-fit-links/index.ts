// hiring-cron-expire-fit-links
// Invoked every 30 minutes by pg_cron. Revokes expired unconsumed tokens
// and flips related applications to `sem_retorno` when still awaiting.
// Contract: specs/001-hiring-pipeline/contracts/hiring-cron-expire-fit-links.md

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return jsonResponse(403, { error: "Forbidden" });
  }

  const started = Date.now();
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const nowIso = new Date().toISOString();
  const { data: expired, error: expiredErr } = await admin
    .from("cultural_fit_tokens")
    .select("id, application_id")
    .lt("expires_at", nowIso)
    .is("consumed_at", null)
    .is("revoked_at", null);
  if (expiredErr) return jsonResponse(500, { error: expiredErr.message });

  const tokens = expired ?? [];
  if (tokens.length === 0) {
    return jsonResponse(200, { tokens_revoked: 0, applications_updated: 0, duration_ms: Date.now() - started });
  }

  const tokenIds = tokens.map((t) => t.id);
  const { error: revokeErr } = await admin
    .from("cultural_fit_tokens")
    .update({ revoked_at: nowIso })
    .in("id", tokenIds);
  if (revokeErr) return jsonResponse(500, { error: revokeErr.message });

  let updated = 0;
  for (const t of tokens) {
    const { error, count } = await admin
      .from("applications")
      .update({ stage: "sem_retorno" }, { count: "exact" })
      .eq("id", t.application_id)
      .eq("stage", "aguardando_fit_cultural");
    if (!error && count) updated += count;

    await admin.from("pending_tasks").insert({
      user_id: null,
      title: "Fit Cultural expirado",
      description: "Link venceu sem resposta. Reenviar?",
      task_type: "hiring_fit_cultural_expired",
      related_id: t.application_id,
      priority: "medium",
    } as never);
  }

  return jsonResponse(200, {
    tokens_revoked: tokens.length,
    applications_updated: updated,
    duration_ms: Date.now() - started,
  });
});

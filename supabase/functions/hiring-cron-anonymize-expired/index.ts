// hiring-cron-anonymize-expired
// Daily (03:00 UTC). Anonymizes candidates whose last application closed_at
// is older than 5 years AND are not yet anonymized.
// Contract: specs/001-hiring-pipeline/contracts/hiring-cron-anonymize-expired.md

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return json(403, { error: "Forbidden" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const cutoff = new Date(Date.now() - 5 * 365 * 86_400_000).toISOString();

  // Find candidates whose every application closed_at < cutoff and who have at
  // least one application. Done via SQL-like chained queries.
  const { data: candidates, error } = await admin
    .from("candidates")
    .select("id")
    .is("anonymized_at", null)
    .limit(500);
  if (error) return json(500, { error: error.message });

  let count = 0;
  for (const c of candidates ?? []) {
    const { data: openApps } = await admin
      .from("applications")
      .select("id")
      .eq("candidate_id", c.id)
      .or(`closed_at.is.null,closed_at.gt.${cutoff}`)
      .limit(1);
    if (openApps && openApps.length > 0) continue;

    const { error: anonErr } = await admin.rpc("anonymize_candidate", {
      p_candidate_id: c.id,
    });
    if (!anonErr) count += 1;
  }

  return json(200, { anonymized: count });
});

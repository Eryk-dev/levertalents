// hiring-anonymize-candidate
// Calls public.anonymize_candidate() then deletes storage artefacts under the
// candidate's prefix. Logs to candidate_access_log.
// Contract: specs/001-hiring-pipeline/contracts/hiring-anonymize-candidate.md

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireRole } from "../_shared/role-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function deleteCandidateStorage(
  admin: ReturnType<typeof createClient>,
  candidateId: string,
) {
  // Walk the bucket finding any object whose path contains the candidate id.
  // Supabase Storage API doesn't support glob on prefix level; we list by
  // known top-level path `companies/*/jobs/*/candidates/<id>/*`.
  const { data: companies } = await admin.storage.from("hiring").list("companies", { limit: 1000 });
  for (const c of companies ?? []) {
    const { data: jobs } = await admin.storage.from("hiring").list(`companies/${c.name}/jobs`, { limit: 1000 });
    for (const j of jobs ?? []) {
      const prefix = `companies/${c.name}/jobs/${j.name}/candidates/${candidateId}`;
      const { data: objects } = await admin.storage.from("hiring").list(prefix, { limit: 1000 });
      if (!objects || objects.length === 0) continue;
      const paths = objects.map((o) => `${prefix}/${o.name}`);
      await admin.storage.from("hiring").remove(paths);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const guard = await requireRole(req, ["rh", "socio", "admin"]);
  if (!guard.ok) return guard.response;

  let body: { candidate_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  if (!body.candidate_id) return json(400, { error: "candidate_id required" });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error: anonErr } = await admin.rpc("anonymize_candidate", {
    p_candidate_id: body.candidate_id,
  });
  if (anonErr) return json(500, { error: anonErr.message });

  try {
    await deleteCandidateStorage(admin, body.candidate_id);
  } catch (e) {
    console.log("storage cleanup partial failure", e);
  }

  await admin.from("candidate_access_log").insert({
    candidate_id: body.candidate_id,
    actor_id: guard.userId,
    action: "update",
    resource: "candidates",
    resource_id: body.candidate_id,
  });

  return json(200, { ok: true });
});

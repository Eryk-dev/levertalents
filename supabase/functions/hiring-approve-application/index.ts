// hiring-approve-application
// Creates pré-cadastro (profiles + team_members) + onboarding handoff when RH
// confirms admissão. Guarded by optimistic-lock check on the application row.
// Contract: specs/001-hiring-pipeline/contracts/hiring-approve-application.md

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const guard = await requireRole(req, ["rh", "socio", "admin"]);
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  const applicationId = String(body.application_id || "");
  const expectedUpdatedAt = String(body.expected_updated_at || "");
  const teamId = (body.team_id as string | null) ?? null;
  const leaderId = (body.leader_id as string | null) ?? null;
  const finalTitle = (body.final_title as string | null) ?? null;
  const contractType = (body.contract_type as string | null) ?? null;
  const startDate = (body.start_date as string | null) ?? null;
  const costCents = body.cost_cents != null ? Number(body.cost_cents) : null;

  if (!applicationId || !expectedUpdatedAt) {
    return json(400, { error: "application_id and expected_updated_at required" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: app, error: appErr } = await admin
    .from("applications")
    .select("id, stage, candidate_id, job_opening_id, updated_at")
    .eq("id", applicationId)
    .maybeSingle();
  if (appErr) return json(500, { error: appErr.message });
  if (!app) return json(404, { error: "Application not found" });
  if (app.updated_at !== expectedUpdatedAt) {
    return json(409, { error: "stale_record", latest_updated_at: app.updated_at });
  }
  if (app.stage !== "aprovado") {
    return json(422, { error: "Application is not in stage 'aprovado'" });
  }

  const { data: candidate } = await admin
    .from("candidates")
    .select("id, email, full_name")
    .eq("id", app.candidate_id)
    .maybeSingle();
  if (!candidate) return json(404, { error: "Candidate not found" });

  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(candidate.email, {
    data: { full_name: candidate.full_name, source: "hiring-pipeline" },
  });
  if (inviteErr) return json(500, { error: `Invite failed: ${inviteErr.message}` });
  const profileId = invite.user?.id;
  if (!profileId) return json(500, { error: "Invite returned no user id" });

  await admin
    .from("profiles")
    .update({ full_name: candidate.full_name })
    .eq("id", profileId);

  if (teamId) {
    const { error: tmErr } = await admin.from("team_members").insert({
      team_id: teamId,
      user_id: profileId,
      leader_id: leaderId,
      position: finalTitle,
      cost: costCents ? (costCents / 100).toFixed(2) : null,
    });
    if (tmErr) return json(500, { error: `team_members: ${tmErr.message}` });
  }

  const { data: handoff, error: handErr } = await admin
    .from("employee_onboarding_handoffs")
    .insert({
      application_id: app.id,
      profile_id: profileId,
      team_id: teamId,
      leader_id: leaderId,
      start_date: startDate,
      contract_type: contractType,
      cost_cents: costCents,
      final_title: finalTitle,
    })
    .select()
    .single();
  if (handErr) return json(500, { error: `handoff: ${handErr.message}` });

  const { data: updated, error: stageErr } = await admin
    .from("applications")
    .update({ stage: "em_admissao" })
    .eq("id", app.id)
    .eq("updated_at", app.updated_at)
    .select("id, stage, updated_at")
    .maybeSingle();
  if (stageErr) return json(500, { error: `stage: ${stageErr.message}` });
  if (!updated) return json(409, { error: "stale_record" });

  return json(200, {
    application_id: app.id,
    profile_id: profileId,
    handoff_id: handoff.id,
    stage: updated.stage,
    updated_at: updated.updated_at,
  });
});

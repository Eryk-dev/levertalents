// hiring-issue-fit-cultural-link
// Mints a single-use token (3-day expiry) for the public Fit Cultural form.
// Stores only SHA-256 hash; raw token is returned once to the caller.
// Contract: specs/001-hiring-pipeline/contracts/hiring-issue-fit-cultural-link.md

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireRole } from "../_shared/role-guard.ts";

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

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  const guard = await requireRole(req, ["rh", "socio", "admin"]);
  if (!guard.ok) return guard.response;

  let payload: { application_id?: string; survey_id?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }
  const { application_id, survey_id } = payload;
  if (!application_id || !survey_id) {
    return jsonResponse(400, { error: "application_id and survey_id are required" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: app, error: appErr } = await admin
    .from("applications")
    .select("id, stage, updated_at")
    .eq("id", application_id)
    .maybeSingle();
  if (appErr) return jsonResponse(500, { error: appErr.message });
  if (!app) return jsonResponse(404, { error: "Application not found" });

  const { data: survey, error: surveyErr } = await admin
    .from("cultural_fit_surveys")
    .select("id")
    .eq("id", survey_id)
    .maybeSingle();
  if (surveyErr) return jsonResponse(500, { error: surveyErr.message });
  if (!survey) return jsonResponse(404, { error: "Survey not found" });

  const nowIso = new Date().toISOString();
  const { data: existing } = await admin
    .from("cultural_fit_tokens")
    .select("id, expires_at")
    .eq("application_id", application_id)
    .is("consumed_at", null)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    return jsonResponse(409, {
      error: "Active token already exists",
      existing_token_id: existing.id,
      existing_expires_at: existing.expires_at,
    });
  }

  const raw = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await sha256Hex(raw);
  const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const { error: insertErr } = await admin.from("cultural_fit_tokens").insert({
    application_id,
    survey_id,
    token_hash: hash,
    expires_at: expires.toISOString(),
  });
  if (insertErr) return jsonResponse(500, { error: insertErr.message });

  if (app.stage !== "aguardando_fit_cultural") {
    await admin
      .from("applications")
      .update({ stage: "aguardando_fit_cultural", last_moved_by: guard.userId })
      .eq("id", application_id)
      .eq("updated_at", app.updated_at);
  }

  const siteUrl =
    Deno.env.get("SITE_URL") ||
    Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "").replace(".supabase.co", ".app") ||
    "https://app.leverup.com.br";

  return jsonResponse(200, {
    application_id,
    survey_id,
    token: raw,
    public_url: `${siteUrl.replace(/\/$/, "")}/hiring/fit/${raw}`,
    expires_at: expires.toISOString(),
  });
});

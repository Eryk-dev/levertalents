// hiring-export-pipeline-csv — streams CSV export scoped to caller.
// Contract: specs/001-hiring-pipeline/contracts/hiring-export-pipeline-csv.md

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireRole } from "../_shared/role-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function csvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const guard = await requireRole(req, ["rh", "socio", "admin", "lider"]);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const fromDate = url.searchParams.get("from_date");
  const toDate = url.searchParams.get("to_date");
  const statusList = url.searchParams.getAll("status");
  const stageList = url.searchParams.getAll("stage");
  const companyIdsParam = url.searchParams.getAll("company_id");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: allowedArr } = await admin.rpc("allowed_companies", { _profile_id: guard.userId });
  const allowedCompanies = (allowedArr ?? []) as string[];
  const wantedCompanies =
    companyIdsParam.length > 0
      ? companyIdsParam.filter((c) => allowedCompanies.includes(c))
      : allowedCompanies;

  if (wantedCompanies.length === 0) {
    return new Response(JSON.stringify({ error: "No accessible companies" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let q = admin
    .from("applications")
    .select(
      `id, stage, stage_entered_at, closed_at,
       job:job_openings!applications_job_opening_id_fkey(id, title, status, opened_at, closed_at, company_id, company:companies(name)),
       candidate:candidates!applications_candidate_id_fkey(id, full_name, email),
       cultural_fit:cultural_fit_responses(submitted_at),
       background_check:background_checks(status_flag),
       interviews(kind, scheduled_at, status),
       decision:hiring_decisions(outcome, decided_at)`,
    )
    .limit(10000);

  if (fromDate) q = q.gte("created_at", fromDate);
  if (toDate) q = q.lte("created_at", toDate);
  if (stageList.length > 0) q = q.in("stage", stageList);

  const { data, error } = await q;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const header = [
    "company_name",
    "job_id",
    "job_title",
    "job_status",
    "job_opened_at",
    "job_closed_at",
    "candidate_id",
    "candidate_full_name",
    "candidate_email",
    "application_id",
    "application_stage",
    "stage_entered_at",
    "days_in_stage",
    "fit_cultural_submitted_at",
    "background_status_flag",
    "last_interview_kind",
    "last_interview_scheduled_at",
    "decision_outcome",
    "hired_at",
  ].join(",");

  const lines: string[] = ["\uFEFF" + header];
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    stage: string;
    stage_entered_at: string;
    closed_at: string | null;
    job: { id: string; title: string; status: string; opened_at: string; closed_at: string | null; company_id: string; company: { name: string } | null } | null;
    candidate: { id: string; full_name: string; email: string } | null;
    cultural_fit: { submitted_at: string | null } | null;
    background_check: { status_flag: string | null } | null;
    interviews: Array<{ kind: string; scheduled_at: string; status: string }>;
    decision: { outcome: string; decided_at: string } | null;
  }>;

  for (const r of rows) {
    if (statusList.length > 0 && r.job && !statusList.includes(r.job.status)) continue;
    if (r.job && !wantedCompanies.includes(r.job.company_id)) continue;
    const lastInterview = (r.interviews ?? [])
      .slice()
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0];
    const stageEnteredAt = r.stage_entered_at ? new Date(r.stage_entered_at) : null;
    const daysInStage = stageEnteredAt
      ? Math.floor((Date.now() - stageEnteredAt.getTime()) / 86_400_000)
      : "";
    const hiredAt = r.stage === "admitido" ? r.closed_at ?? "" : "";
    const cells = [
      r.job?.company?.name ?? "",
      r.job?.id ?? "",
      r.job?.title ?? "",
      r.job?.status ?? "",
      r.job?.opened_at ?? "",
      r.job?.closed_at ?? "",
      r.candidate?.id ?? "",
      r.candidate?.full_name ?? "",
      r.candidate?.email ?? "",
      r.id,
      r.stage,
      r.stage_entered_at,
      daysInStage,
      r.cultural_fit?.submitted_at ?? "",
      r.background_check?.status_flag ?? "",
      lastInterview?.kind ?? "",
      lastInterview?.scheduled_at ?? "",
      r.decision?.outcome ?? "",
      hiredAt,
    ];
    lines.push(cells.map(csvCell).join(","));
  }

  const body = lines.join("\n") + "\n";
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  console.log(
    JSON.stringify({
      actor: guard.userId,
      role: guard.role,
      filters: { fromDate, toDate, statusList, stageList, companies: wantedCompanies.length },
      row_count: Math.max(0, lines.length - 1),
      at: new Date().toISOString(),
    }),
  );
  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hiring-export-${stamp}.csv"`,
    },
  });
});

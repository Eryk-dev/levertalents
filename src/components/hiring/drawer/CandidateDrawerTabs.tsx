import {
  Calendar,
  FileText,
  History,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DrawerTab =
  | "perfil"
  | "entrevistas"
  | "fit"
  | "antecedentes"
  | "historico"
  | "audit";

const TAB_ICONS = {
  perfil: FileText,
  entrevistas: Calendar,
  fit: Sparkles,
  antecedentes: ShieldCheck,
  historico: History,
  audit: ShieldAlert,
} as const;

const TAB_LABELS: Record<DrawerTab, string> = {
  perfil: "Perfil",
  entrevistas: "Entrevistas",
  fit: "Fit",
  antecedentes: "Antecedentes",
  historico: "Histórico",
  audit: "Audit log",
};

interface CandidateDrawerTabsProps {
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
  /** Audit log tab visível apenas RH/admin (gating via CASL ability ou role check). */
  showAuditLog: boolean;
}

/**
 * Plan 02-09 Task 1a — Tab strip horizontal do CandidateDrawer.
 * Renderiza CV/Entrevistas/Fit/Antecedentes/Histórico [+ Audit log se RH/admin].
 */
export function CandidateDrawerTabs({
  activeTab,
  onTabChange,
  showAuditLog,
}: CandidateDrawerTabsProps) {
  const visible: DrawerTab[] = [
    "perfil",
    "entrevistas",
    "fit",
    "antecedentes",
    "historico",
  ];
  if (showAuditLog) visible.push("audit");

  return (
    <div role="tablist" className="flex items-end gap-0 border-b border-border px-4">
      {visible.map((key) => {
        const Icon = TAB_ICONS[key];
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(key)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-2 text-[12.5px] transition-colors -mb-px",
              "border-b-2",
              isActive
                ? "text-text font-semibold border-text"
                : "text-text-muted font-[450] border-transparent hover:text-text",
            )}
          >
            <Icon className="h-3 w-3" aria-hidden />
            {TAB_LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}

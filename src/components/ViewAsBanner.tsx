import { Eye, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/hooks/useAuth";

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  socio: "Sócio",
  rh: "RH · Business Partner",
  lider: "Líder",
  colaborador: "Colaboradora(o)",
};

export function ViewAsBanner() {
  const { isViewingAs, viewAsRole, setViewAsRole } = useAuth();
  const navigate = useNavigate();

  if (!isViewingAs || !viewAsRole) return null;

  const handleExit = () => {
    setViewAsRole(null);
    toast.success("Voltou à visualização de Administrador");
    navigate("/admin");
  };

  return (
    <div className="flex h-7 shrink-0 items-center justify-center gap-2 border-b border-amber-300 bg-amber-100 px-3 text-[11.5px] text-amber-900">
      <Eye className="h-3 w-3" />
      <span>
        Visualizando como <strong className="font-semibold">{ROLE_LABEL[viewAsRole]}</strong>
      </span>
      <span className="text-amber-700/80">·</span>
      <button
        type="button"
        onClick={handleExit}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium underline-offset-2 hover:bg-amber-200 hover:underline"
      >
        <X className="h-3 w-3" />
        Voltar para Administrador
      </button>
    </div>
  );
}

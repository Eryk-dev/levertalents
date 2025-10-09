import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LinkedPDIsSectionProps {
  oneOnOneId: string;
}

export function LinkedPDIsSection({ oneOnOneId }: LinkedPDIsSectionProps) {
  const navigate = useNavigate();

  const { data: linkedPDIs, isLoading } = useQuery({
    queryKey: ["linked-pdis", oneOnOneId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("development_plans")
        .select(`
          id,
          title,
          status,
          progress_percentage,
          user:profiles!development_plans_user_id_fkey(full_name)
        `)
        .eq("one_on_one_id", oneOnOneId);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="border-t pt-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Target className="h-4 w-4" />
          PDIs Vinculados
        </h3>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!linkedPDIs || linkedPDIs.length === 0) {
    return (
      <div className="border-t pt-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Target className="h-4 w-4" />
          PDIs Vinculados
        </h3>
        <p className="text-sm text-muted-foreground">Nenhum PDI vinculado a este 1:1</p>
      </div>
    );
  }

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending_approval: { label: "Aguardando", variant: "secondary" },
    approved: { label: "Aprovado", variant: "default" },
    in_progress: { label: "Em Andamento", variant: "default" },
    completed: { label: "Concluído", variant: "outline" },
    cancelled: { label: "Cancelado", variant: "destructive" },
  };

  return (
    <div className="border-t pt-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Target className="h-4 w-4" />
        PDIs Vinculados ({linkedPDIs.length})
      </h3>
      <div className="space-y-2">
        {linkedPDIs.map((pdi: any) => (
          <div
            key={pdi.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-sm">{pdi.title}</p>
              <p className="text-xs text-muted-foreground">{pdi.user?.full_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusMap[pdi.status]?.variant || "outline"} className="text-xs">
                  {statusMap[pdi.status]?.label || pdi.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{pdi.progress_percentage}%</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/pdi")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

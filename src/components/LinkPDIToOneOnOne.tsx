import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link2, Unlink } from "lucide-react";

interface LinkPDIToOneOnOneProps {
  pdiId: string;
  currentOneOnOneId?: string | null;
  onSuccess?: () => void;
}

export function LinkPDIToOneOnOne({ pdiId, currentOneOnOneId, onSuccess }: LinkPDIToOneOnOneProps) {
  const [open, setOpen] = useState(false);
  const [selectedOneOnOne, setSelectedOneOnOne] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: availableOneOnOnes } = useQuery({
    queryKey: ["available-one-on-ones", pdiId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("one_on_ones")
        .select(`
          id,
          scheduled_date,
          collaborator:profiles!one_on_ones_collaborator_id_fkey(full_name)
        `)
        .eq("status", "completed")
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const linkMutation = useMutation({
    mutationFn: async (oneOnOneId: string | null) => {
      const { error } = await supabase
        .from("development_plans")
        .update({ one_on_one_id: oneOnOneId })
        .eq("id", pdiId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["development_plans"] });
      queryClient.invalidateQueries({ queryKey: ["one_on_ones"] });
      toast.success(selectedOneOnOne ? "PDI vinculado ao 1:1" : "PDI desvinculado");
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error("Erro ao vincular: " + error.message);
    },
  });

  const handleLink = () => {
    if (!selectedOneOnOne && !currentOneOnOneId) {
      toast.error("Selecione um 1:1");
      return;
    }
    linkMutation.mutate(selectedOneOnOne || null);
  };

  const handleUnlink = () => {
    linkMutation.mutate(null);
  };

  return (
    <>
      <Button
        variant={currentOneOnOneId ? "outline" : "secondary"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {currentOneOnOneId ? (
          <>
            <Unlink className="h-4 w-4 mr-2" />
            Gerenciar Vínculo
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4 mr-2" />
            Vincular a 1:1
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentOneOnOneId ? "Gerenciar Vínculo com 1:1" : "Vincular PDI a 1:1"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {currentOneOnOneId && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Atualmente vinculado</p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleUnlink}
                  disabled={linkMutation.isPending}
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Desvincular
                </Button>
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">
                {currentOneOnOneId ? "Ou vincular a outro 1:1:" : "Selecione um 1:1:"}
              </p>
              <Select value={selectedOneOnOne} onValueChange={setSelectedOneOnOne}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um 1:1 concluído" />
                </SelectTrigger>
                <SelectContent>
                  {availableOneOnOnes?.map((oneOnOne) => (
                    <SelectItem key={oneOnOne.id} value={oneOnOne.id}>
                      {oneOnOne.collaborator?.full_name} - {new Date(oneOnOne.scheduled_date).toLocaleDateString('pt-BR')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleLink}
              disabled={!selectedOneOnOne || linkMutation.isPending}
              className="w-full"
            >
              {linkMutation.isPending ? "Vinculando..." : "Vincular"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { handleSupabaseError } from "@/lib/supabaseError";

interface RetryTranscriptionButtonProps {
  meetingId: string;
  audioUrl: string;
  hasTranscription: boolean;
}

export const RetryTranscriptionButton = ({
  meetingId,
  audioUrl,
  hasTranscription
}: RetryTranscriptionButtonProps) => {
  const { transcribeFromUrl, isTranscribing } = useAudioTranscription();
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      toast.info("Iniciando transcrição...");

      // Pré-valida o audioUrl antes de chamar a Edge function —
      // URLs assinadas do Supabase storage expiram, o que causava
      // um erro genérico de network. Mostra um toast específico.
      try {
        const probe = await fetch(audioUrl, { method: "GET" });
        if (!probe.ok) {
          if (probe.status >= 400 && probe.status < 500) {
            toast.error("Áudio expirado — peça para reenviar");
          } else {
            toast.error(`Não foi possível baixar o áudio (HTTP ${probe.status})`);
          }
          return;
        }
      } catch (fetchErr) {
        handleSupabaseError(
          fetchErr as Error,
          "Erro ao acessar o áudio",
        );
        return;
      }

      const transcription = await transcribeFromUrl(audioUrl);

      if (transcription) {
        // Buscar estrutura atual da reunião — usa maybeSingle() para não
        // lançar caso o registro tenha sido removido entre a abertura da UI e o retry.
        const { data: meeting, error: fetchError } = await supabase
          .from('one_on_ones')
          .select('meeting_structure')
          .eq('id', meetingId)
          .maybeSingle();

        if (fetchError) throw handleSupabaseError(fetchError, "Erro ao carregar 1:1", { silent: true });
        if (!meeting) {
          toast.error("1:1 não encontrada — talvez tenha sido removida.");
          return;
        }

        // Atualizar com a transcrição
        const currentStructure = (meeting.meeting_structure || {}) as Record<string, any>;
        const updatedStructure = {
          ...currentStructure,
          transcricao: transcription
        };

        const { error: updateError } = await supabase
          .from('one_on_ones')
          .update({ meeting_structure: updatedStructure as any })
          .eq('id', meetingId);

        if (updateError) throw handleSupabaseError(updateError, "Erro ao salvar transcrição", { silent: true });

        queryClient.invalidateQueries({ queryKey: ["one_on_ones"] });
        toast.success("Transcrição concluída com sucesso!");
      }
    } catch (error: any) {
      // Erros já tratados acima (handleSupabaseError silent) re-throw como Error
      // pronto. Outros erros (ex.: transcribeFromUrl) caem aqui.
      console.error('Retry transcription error:', error);
      toast.error("Erro ao tentar transcrever: " + (error?.message || "erro desconhecido"));
    } finally {
      setIsRetrying(false);
    }
  };

  if (hasTranscription) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRetry}
      disabled={isTranscribing || isRetrying}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
      {isRetrying ? 'Transcrevendo...' : 'Tentar Transcrever'}
    </Button>
  );
};

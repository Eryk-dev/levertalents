import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
      const transcription = await transcribeFromUrl(audioUrl);
      
      if (transcription) {
        // Buscar estrutura atual da reunião
        const { data: meeting, error: fetchError } = await supabase
          .from('one_on_ones')
          .select('meeting_structure')
          .eq('id', meetingId)
          .single();

        if (fetchError) throw fetchError;

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

        if (updateError) throw updateError;

        queryClient.invalidateQueries({ queryKey: ["one_on_ones"] });
        toast.success("Transcrição concluída com sucesso!");
      }
    } catch (error: any) {
      console.error('Retry transcription error:', error);
      toast.error("Erro ao tentar transcrever: " + error.message);
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

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useAudioTranscription = () => {
  const [isTranscribing, setIsTranscribing] = useState(false);

  const transcribeAudio = async (audioBase64: string): Promise<string | null> => {
    setIsTranscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: audioBase64 }
      });

      if (error) throw error;

      if (data?.text) {
        toast({
          title: "Transcrição concluída!",
          description: "O texto foi preenchido automaticamente.",
        });
        return data.text;
      }

      throw new Error("Nenhum texto foi retornado");
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast({
        title: "Erro na transcrição",
        description: error.message || "Não foi possível transcrever o áudio. Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };

  return {
    transcribeAudio,
    isTranscribing,
  };
};

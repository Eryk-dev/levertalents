import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useAudioTranscription = () => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSavingAudio, setIsSavingAudio] = useState(false);

  const saveAudioToStorage = async (
    audioBase64: string,
    meetingId: string,
    duration: number
  ): Promise<string | null> => {
    setIsSavingAudio(true);
    try {
      // Converter base64 para blob
      const byteCharacters = atob(audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/webm' });

      // Upload para o storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileName = `${user.id}/${meetingId}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('meeting-audios')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('meeting-audios')
        .getPublicUrl(fileName);

      // Atualizar registro da 1:1 com URL do áudio
      const { error: updateError } = await supabase
        .from('one_on_ones')
        .update({ 
          audio_url: publicUrl,
          audio_duration: duration
        })
        .eq('id', meetingId);

      if (updateError) throw updateError;

      toast.success("Áudio salvo com sucesso!");
      return publicUrl;
    } catch (error: any) {
      console.error('Save audio error:', error);
      toast.error(error.message || "Erro ao salvar áudio.");
      return null;
    } finally {
      setIsSavingAudio(false);
    }
  };

  const transcribeAudio = async (audioBase64: string): Promise<string | null> => {
    setIsTranscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: audioBase64 }
      });

      if (error) throw error;

      if (data?.text) {
        toast.success("Transcrição concluída! O texto foi preenchido automaticamente.");
        return data.text;
      }

      throw new Error("Nenhum texto foi retornado");
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast.error("Erro na transcrição. O áudio foi salvo e você pode tentar transcrever depois.");
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };

  const transcribeFromUrl = async (audioUrl: string): Promise<string | null> => {
    setIsTranscribing(true);
    try {
      // Baixar o áudio do storage
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      
      // Converter para base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      
      const audioBase64 = await base64Promise;
      
      // Transcrever
      return await transcribeAudio(audioBase64);
    } catch (error: any) {
      console.error('Transcribe from URL error:', error);
      toast.error(error.message || "Erro ao transcrever áudio.");
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };

  return {
    transcribeAudio,
    transcribeFromUrl,
    saveAudioToStorage,
    isTranscribing,
    isSavingAudio,
  };
};

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mic, Square, ArrowRight, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { OneOnOne } from "@/hooks/useOneOnOnes";
import { PDIFormIntegrated } from "./PDIFormIntegrated";
import { PDIReviewCard } from "./PDIReviewCard";
import { usePDIIntegrated, PDIFormData } from "@/hooks/usePDIIntegrated";

interface OneOnOneMeetingFormProps {
  oneOnOne: OneOnOne;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MeetingData {
  pdi_review?: string;
  roteiro?: string;
  pdi_mensal?: PDIFormData;
  transcricao?: string;
  resumo?: string;
  audio_duration?: number;
}

export const OneOnOneMeetingForm = ({ open, onOpenChange, oneOnOne }: OneOnOneMeetingFormProps) => {
  const queryClient = useQueryClient();
  const { getPDIFromOneOnOne, getLatestPDIForCollaborator, createPDIFromOneOnOne, isCreating } = usePDIIntegrated();
  
  const { data: existingPDI } = getPDIFromOneOnOne(oneOnOne.id);
  const { data: latestPDI } = getLatestPDIForCollaborator(oneOnOne.collaborator_id);

  const [currentStep, setCurrentStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldFinalize, setShouldFinalize] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const [meetingData, setMeetingData] = useState<MeetingData>({
    pdi_review: "",
    roteiro: "",
  });

  useEffect(() => {
    if (open && oneOnOne?.meeting_structure) {
      setMeetingData(oneOnOne.meeting_structure as MeetingData);
    } else if (open) {
      setMeetingData({ pdi_review: "", roteiro: "" });
      setCurrentStep(0);
      setIsRecording(false);
      setRecordingTime(0);
      setAudioBlob(null);
    }
  }, [open, oneOnOne]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        console.log('Audio blob created:', blob.size, 'bytes');
      };

      mediaRecorder.start(1000);
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success("Gravação iniciada!");
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error("Erro ao acessar microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
    }
  };

  const handlePDISubmit = (data: PDIFormData) => {
    setMeetingData({ ...meetingData, pdi_mensal: data });
    toast.success("PDI salvo!");
  };

  useEffect(() => {
    if (shouldFinalize && audioBlob) {
      console.log('audioBlob ready, starting finalization...');
      processFinalization();
    }
  }, [audioBlob, shouldFinalize]);

  const processFinalization = async () => {
    if (!audioBlob) {
      console.error('No audio blob available');
      toast.error("Erro: áudio não encontrado");
      return;
    }

    try {
      setIsProcessing(true);
      toast.info("Sua 1:1 foi registrada! Você terá a transcrição e resumo em instantes.");
      
      // Convert audio to base64
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Transcribe audio
      const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: audioBase64 }
      });

      if (transcriptionError) {
        console.error('Transcription error:', transcriptionError);
        throw new Error(transcriptionError.message || 'Erro ao transcrever áudio');
      }

      const transcription = transcriptionData?.text || "";

      // Generate summary
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('summarize-meeting', {
        body: { 
          meetingData: {
            ...meetingData,
            transcricao: transcription
          }
        }
      });

      if (summaryError) throw summaryError;

      const finalData = {
        pdi_review: meetingData.pdi_review,
        roteiro: meetingData.roteiro,
        pdi_mensal: meetingData.pdi_mensal,
        transcricao: transcription,
        resumo: summaryData?.summary || "",
        audio_duration: Math.floor((Date.now() - startTimeRef.current) / 1000)
      };

      // Save PDI if exists
      if (meetingData.pdi_mensal) {
        await createPDIFromOneOnOne({
          oneOnOneId: oneOnOne.id,
          collaboratorId: oneOnOne.collaborator_id,
          data: meetingData.pdi_mensal,
        });
      }

      // Save to database
      const { error: updateError } = await supabase
        .from("one_on_ones")
        .update({
          status: "completed",
          meeting_structure: finalData as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", oneOnOne?.id);

      if (updateError) throw updateError;

      toast.success("1:1 finalizado com sucesso! Transcrição e resumo foram gerados.");
      queryClient.invalidateQueries({ queryKey: ["one_on_ones"] });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error finalizing meeting:', error);
      toast.error("Erro ao finalizar reunião: " + error.message);
    } finally {
      setIsProcessing(false);
      setShouldFinalize(false);
    }
  };

  const handleFinalizeClick = () => {
    console.log('Finalize clicked, audioBlob:', audioBlob?.size);
    if (!isRecording) {
      toast.error("Nenhuma gravação ativa");
      return;
    }
    
    stopRecording();
    setShouldFinalize(true);
    toast.info("Parando gravação...");
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const steps = [
    { title: "Revisão PDI Anterior", key: "pdi_review" },
    { title: "Roteiro", key: "roteiro" },
    { title: "PDI Mensal", key: "pdi_mensal" },
    { title: "Finalizar", key: "finalize" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>1:1 - {oneOnOne?.collaborator?.full_name}</DialogTitle>
        </DialogHeader>

        {/* Recording Status Bar */}
        {!isRecording && currentStep === 0 && (
          <div className="flex justify-center mb-6">
            <Button onClick={startRecording} size="lg" className="gap-2">
              <Mic className="h-5 w-5" />
              Começar 1:1
            </Button>
          </div>
        )}

        {isRecording && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <span className="font-medium">Gravando: {formatTime(recordingTime)}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                A gravação continua durante todo o 1:1
              </span>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {isRecording && (
          <div className="mb-6">
            <Progress value={(currentStep / 3) * 100} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              {steps.map((step, idx) => (
                <span key={idx} className={currentStep === idx ? "font-medium text-foreground" : ""}>
                  {step.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Step Content */}
        {isRecording && (
          <div className="space-y-6">
            {currentStep === 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Revisão do PDI Anterior</h3>
                {latestPDI && latestPDI.id !== existingPDI?.id ? (
                  <PDIReviewCard 
                    pdi={latestPDI}
                    onViewDetails={() => {}}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum PDI anterior encontrado para revisar.</p>
                  </div>
                )}
                <Textarea
                  value={meetingData.pdi_review}
                  onChange={(e) => setMeetingData({ ...meetingData, pdi_review: e.target.value })}
                  placeholder="Anote aqui os comentários sobre o PDI anterior..."
                  className="min-h-[100px]"
                />
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Roteiro de 1:1 Mensal</h3>
                
                <div className="bg-muted/50 p-6 rounded-lg space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-base mb-2">Estrutura sugerida (30 a 45 min)</h4>
                    <ul className="space-y-1 ml-4">
                      <li>• 5 min – Aquecimento / como está o colaborador</li>
                      <li>• 20 min – Desenvolvimento / conquistas, desafios, feedbacks</li>
                      <li>• 15 min – Projeção / alinhamento de objetivos e próximos passos</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-base mb-2">1. Aquecimento (quebrar o gelo e abrir espaço)</h4>
                    <ul className="space-y-1 ml-4">
                      <li>• Como você está se sentindo neste mês, tanto no trabalho quanto pessoalmente?</li>
                      <li>• Teve algo que te deixou especialmente satisfeito ou insatisfeito nos últimos dias?</li>
                      <li>• Há algum fator externo (carga, ambiente, processos) que está impactando sua motivação?</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-base mb-2">2. Desenvolvimento (olhar para o mês que passou)</h4>
                    <ul className="space-y-1 ml-4">
                      <li>• Quais foram suas principais conquistas neste mês?</li>
                      <li>• O que você gostaria de destacar que funcionou bem no time/projetos?</li>
                      <li>• Quais desafios você enfrentou e como posso te apoiar para superá-los?</li>
                      <li>• Há alguma habilidade que você percebeu que precisa reforçar?</li>
                      <li>• Como você percebe seu alinhamento com a cultura e valores da empresa?</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-base mb-2">3. Projeção (definir direção e propósito para o próximo mês)</h4>
                    <ul className="space-y-1 ml-4">
                      <li>• O que você gostaria de alcançar no próximo mês?</li>
                      <li>• Qual aprendizado ou habilidade nova você quer desenvolver?</li>
                      <li>• Onde você acredita que pode gerar mais impacto no time/projetos?</li>
                      <li>• Há algo que você gostaria que mudasse na sua rotina ou nos processos?</li>
                      <li>• Qual é o objetivo/propósito que definimos juntos para o próximo mês? (ex: melhorar a organização do fluxo de tarefas no projeto X ou se aprofundar na ferramenta Y para entregar com mais autonomia)</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-base mb-2">Encerramento</h4>
                    <ul className="space-y-1 ml-4">
                      <li>• Confirme o objetivo definido em conjunto</li>
                      <li>• Pergunte: "Como posso te apoiar melhor neste próximo mês?"</li>
                      <li>• Registre os pontos combinados (ações, prazos, responsáveis)</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Anotações da Reunião</Label>
                  <Textarea
                    value={meetingData.roteiro}
                    onChange={(e) => setMeetingData({ ...meetingData, roteiro: e.target.value })}
                    placeholder="Anote aqui os principais pontos discutidos durante a reunião..."
                    className="min-h-[150px]"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">PDI Mensal</h3>
                {existingPDI ? (
                  <div className="text-center py-8 space-y-4">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="text-muted-foreground">
                      PDI já criado para esta reunião.
                    </p>
                  </div>
                ) : (
                  <PDIFormIntegrated 
                    onSubmit={handlePDISubmit}
                    isSubmitting={isCreating}
                  />
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Finalizar 1:1</h3>
                <div className="bg-muted p-6 rounded-lg text-center space-y-4">
                  <p className="text-muted-foreground">
                    Ao finalizar, a gravação será parada e processada pela AI para gerar:
                  </p>
                  <ul className="text-sm space-y-2">
                    <li>✅ Transcrição completa da reunião</li>
                    <li>✅ Resumo estruturado com principais pontos</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    Tempo de gravação: <strong>{formatTime(recordingTime)}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          
          <div className="flex gap-2">
            {isRecording && currentStep < 3 && (
              <Button onClick={nextStep} className="gap-2">
                Próxima Etapa
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            
            {isRecording && currentStep === 3 && (
              <Button 
                onClick={handleFinalizeClick}
                disabled={isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4" />
                    Finalizar 1:1
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
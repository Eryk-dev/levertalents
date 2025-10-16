import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Download, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AudioPlayerProps {
  audioUrl: string;
  fileName?: string;
  audioDuration?: number; // Duração em segundos do banco de dados
}

export function AudioPlayer({ audioUrl, fileName = "audio.webm", audioDuration }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioDuration || 0);
  const [playbackRate, setPlaybackRate] = useState("1");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log("🎵 Inicializando AudioPlayer com URL:", audioUrl, "- Duração do banco:", audioDuration);
    
    // Se temos duração do banco, usa ela imediatamente
    if (audioDuration) {
      setDuration(audioDuration);
      setIsLoading(false);
    }

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      // Só atualiza se conseguir carregar a duração do arquivo E ela for válida
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
        console.log("✅ Áudio carregado do arquivo. Duração:", audio.duration, "segundos");
      } else if (audioDuration) {
        // Fallback para a duração do banco se o arquivo não carregar
        setDuration(audioDuration);
        console.log("✅ Usando duração do banco:", audioDuration, "segundos");
      }
      setIsLoading(false);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      const audioElement = e.target as HTMLAudioElement;
      console.error("❌ Erro ao carregar áudio:", {
        url: audioUrl,
        error: audioElement.error,
        errorCode: audioElement.error?.code,
        errorMessage: audioElement.error?.message,
        networkState: audioElement.networkState,
        readyState: audioElement.readyState
      });
      
      let errorMsg = "Não foi possível carregar o áudio.";
      
      if (audioElement.error) {
        switch (audioElement.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMsg = "Carregamento do áudio foi interrompido.";
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMsg = "Erro de rede ao carregar o áudio.";
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMsg = "Erro ao decodificar o áudio.";
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMsg = "Formato de áudio não suportado ou arquivo não encontrado.";
            break;
        }
      }
      
      // Mesmo com erro, mantém a duração do banco se disponível
      if (audioDuration) {
        setDuration(audioDuration);
      }
      
      setHasError(true);
      setIsLoading(false);
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    };
    const handleCanPlay = () => {
      console.log("✅ Áudio pronto para reprodução");
      setIsLoading(false);
      setHasError(false);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    // Força o carregamento
    audio.load();

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [audioUrl, audioDuration]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
        console.log("Áudio reproduzindo");
      }
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      toast.error("Erro ao reproduzir áudio");
      setIsPlaying(false);
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handlePlaybackRateChange = (rate: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = parseFloat(rate);
    setPlaybackRate(rate);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erro ao baixar áudio:", error);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) {
      return "0:00";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <audio ref={audioRef} src={audioUrl} preload="auto" />
        
        {hasError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {isLoading && !hasError && (
          <div className="text-center text-muted-foreground py-4">
            Carregando áudio...
          </div>
        )}
        
        <div className="space-y-4">{!hasError && (
            <>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlay}
              className="shrink-0"
              disabled={isLoading || hasError}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <div className="flex-1 space-y-2">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="cursor-pointer"
                disabled={isLoading || hasError}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Velocidade:</span>
            <Select value={playbackRate} onValueChange={handlePlaybackRateChange} disabled={isLoading || hasError}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="0.75">0.75x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="1.25">1.25x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="1.75">1.75x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="ml-auto"
              disabled={hasError}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
          </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

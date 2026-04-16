import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClimateSurveys } from "@/hooks/useClimateSurveys";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (surveyId: string) => void;
}

export function ClimateSurveyFormDialog({ open, onOpenChange, onCreated }: Props) {
  const { createSurveyAsync, isCreatingSurvey } = useClimateSurveys();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("draft");

  const reset = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setStatus("draft");
  };

  const handleSubmit = async () => {
    if (!title || !startDate || !endDate) return;
    const created = await createSurveyAsync({
      title,
      description: description || undefined,
      start_date: startDate,
      end_date: endDate,
      status,
    });
    reset();
    onOpenChange(false);
    onCreated?.(created.id);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova pesquisa de clima</DialogTitle>
          <DialogDescription>
            Depois de criar, adicione perguntas antes de ativar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="survey-title">Título</Label>
            <Input id="survey-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Clima Q2 2026" />
          </div>
          <div>
            <Label htmlFor="survey-desc">Descrição</Label>
            <Textarea id="survey-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="survey-start">Início</Label>
              <Input id="survey-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="survey-end">Fim</Label>
              <Input id="survey-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Status inicial</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "active")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho (não aparece para colaboradores)</SelectItem>
                <SelectItem value="active">Ativa (começa a aceitar respostas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title || !startDate || !endDate || isCreatingSurvey}>
            {isCreatingSurvey ? "Criando..." : "Criar pesquisa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

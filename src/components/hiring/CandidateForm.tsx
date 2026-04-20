import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/primitives";
import { useCandidateByEmail, useCreateCandidate, useUploadCv } from "@/hooks/hiring/useCandidates";
import type {
  CandidateRow,
  DocumentType,
} from "@/integrations/supabase/hiring-types";
import { DuplicateCandidateDialog } from "./DuplicateCandidateDialog";

const schema = z.object({
  full_name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  document_type: z.enum(["cpf", "passport", "rne", "other"]).default("cpf"),
  document_number: z.string().optional(),
  source: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CandidateFormProps {
  jobOpeningId?: string | null;
  companyId?: string | null;
  onCreated: (candidateId: string) => void;
  onCancel: () => void;
}

export function CandidateForm({ jobOpeningId, companyId, onCreated, onCancel }: CandidateFormProps) {
  const [email, setEmail] = useState("");
  const { data: duplicate } = useCandidateByEmail(email);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [allowCreateSame, setAllowCreateSame] = useState(false);
  const [cv, setCv] = useState<File | null>(null);

  const create = useCreateCandidate();
  const uploadCv = useUploadCv();

  const { register, handleSubmit, formState, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { document_type: "cpf" },
  });

  const onSubmit = async (values: FormValues) => {
    if (duplicate && !allowCreateSame) {
      setShowDuplicate(true);
      return;
    }
    create.mutate(
      {
        full_name: values.full_name,
        email: values.email,
        phone: values.phone || null,
        document_type: values.document_type as DocumentType,
        document_number: values.document_number || null,
        source: values.source || null,
        cpf: values.document_type === "cpf" ? values.document_number || null : null,
      },
      {
        onSuccess: async (row: CandidateRow) => {
          if (cv && companyId && jobOpeningId) {
            await uploadCv.mutateAsync({
              candidateId: row.id,
              companyId,
              jobOpeningId,
              file: cv,
            });
          }
          onCreated(row.id);
        },
      },
    );
  };

  const documentType = watch("document_type");

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <SectionCard title="Dados do candidato">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" {...register("full_name")} />
              {formState.errors.full_name && (
                <p className="text-xs text-destructive">{formState.errors.full_name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                {...register("email", {
                  onChange: (e) => setEmail((e.target as HTMLInputElement).value),
                })}
              />
              {formState.errors.email && (
                <p className="text-xs text-destructive">{formState.errors.email.message}</p>
              )}
              {duplicate ? (
                <p className="text-xs text-warning">
                  Já existe um candidato com este e-mail. Ao salvar vamos oferecer o reaproveitamento.
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="document_type">Tipo de documento</Label>
              <Select
                value={documentType}
                onValueChange={(v) => setValue("document_type", v as DocumentType)}
              >
                <SelectTrigger id="document_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="passport">Passaporte</SelectItem>
                  <SelectItem value="rne">RNE</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="document_number">Número do documento</Label>
              <Input id="document_number" {...register("document_number")} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="source">Origem</Label>
              <Input id="source" placeholder="linkedin, indicação, portal interno…" {...register("source")} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="cv">Currículo (CV)</Label>
              <Input
                id="cv"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCv(e.target.files?.[0] ?? null)}
              />
              {!jobOpeningId && cv ? (
                <p className="text-xs text-muted-foreground">
                  Para anexar o CV, crie o candidato a partir de uma vaga (o path no bucket precisa do job_id).
                </p>
              ) : null}
            </div>
          </div>
        </SectionCard>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Salvando…" : "Salvar candidato"}
          </Button>
        </div>
      </form>

      {duplicate ? (
        <DuplicateCandidateDialog
          open={showDuplicate}
          candidate={duplicate}
          jobOpeningId={jobOpeningId ?? null}
          onReused={() => {
            setShowDuplicate(false);
            onCreated(duplicate.id);
          }}
          onCreateWithDifferentEmail={() => {
            setShowDuplicate(false);
            setAllowCreateSame(true);
          }}
          onCancel={() => setShowDuplicate(false)}
        />
      ) : null}
    </>
  );
}

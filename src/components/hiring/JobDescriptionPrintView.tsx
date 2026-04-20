import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Upload } from "lucide-react";
import { useUploadDescriptionPdf } from "@/hooks/hiring/useJobDescription";
import type {
  JobDescriptionRow,
  JobOpeningRow,
} from "@/integrations/supabase/hiring-types";

interface JobDescriptionPrintViewProps {
  job: JobOpeningRow;
  description: JobDescriptionRow;
}

export function JobDescriptionPrintView({ job, description }: JobDescriptionPrintViewProps) {
  const uploadPdf = useUploadDescriptionPdf();
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File) => {
    uploadPdf.mutate({
      jobOpeningId: job.id,
      descriptionId: description.id,
      companyId: job.company_id,
      version: description.version,
      file,
    });
  };

  const hasStructured =
    !!description.daily_routine ||
    !!(description.requirements?.length) ||
    !!description.expectations ||
    !!description.work_schedule ||
    !!(description.benefits_list?.length);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" aria-hidden />
          Baixar PDF (via impressão)
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploadPdf.isPending}
        >
          <Upload className="mr-1 h-4 w-4" aria-hidden />
          {uploadPdf.isPending ? "Enviando…" : "Anexar PDF salvo"}
        </Button>
        {description.pdf_path ? (
          <span className="text-xs text-muted-foreground">PDF anexado: {description.pdf_path}</span>
        ) : null}
      </div>

      <div className="hidden print:block">
        <style>{`
          @media print {
            body, main, header, aside, nav { background: white !important; color: black !important; }
            aside, header.page-header, nav, button { display: none !important; }
            .print-hide { display: none !important; }
            .print-doc { padding: 2rem; }
            .print-section { margin-bottom: 1.5rem; }
            .print-kicker { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.25rem; }
            .print-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; }
            .print-chip { border: 1px solid #d1d5db; border-radius: 4px; padding: 2px 8px; font-size: 12px; }
          }
        `}</style>
        <article className="print-doc">
          <h1 className="text-2xl font-semibold">{job.title}</h1>
          <p className="text-sm text-muted-foreground">Vaga · v{description.version}</p>

          {hasStructured ? (
            <div className="mt-6 space-y-5">
              {description.daily_routine && (
                <div className="print-section">
                  <div className="print-kicker">Rotina do dia a dia</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{description.daily_routine}</p>
                </div>
              )}
              {description.requirements?.length ? (
                <div className="print-section">
                  <div className="print-kicker">Requisitos</div>
                  <div className="print-chips">
                    {description.requirements.map((r) => (
                      <span key={r} className="print-chip">{r}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {description.expectations && (
                <div className="print-section">
                  <div className="print-kicker">O que esperamos de você</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{description.expectations}</p>
                </div>
              )}
              {description.work_schedule && (
                <div className="print-section">
                  <div className="print-kicker">Jornada de trabalho</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{description.work_schedule}</p>
                </div>
              )}
              {description.benefits_list?.length ? (
                <div className="print-section">
                  <div className="print-kicker">Benefícios</div>
                  <div className="print-chips">
                    {description.benefits_list.map((b) => (
                      <span key={b} className="print-chip">{b}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {description.content_md && (
                <div className="print-section">
                  <div className="print-kicker">Descrição geral</div>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{description.content_md}</pre>
                </div>
              )}
            </div>
          ) : (
            <pre className="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed">{description.content_md}</pre>
          )}
        </article>
      </div>
    </>
  );
}

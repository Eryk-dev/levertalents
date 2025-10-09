import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useEvaluations, EvaluationInput } from "@/hooks/useEvaluations";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const evaluationSchema = z.object({
  evaluated_user_id: z.string().min(1, "Selecione um colaborador"),
  period: z.string().min(1, "Informe o período"),
  overall_score: z.number().min(0).max(5),
  technical_score: z.number().min(0).max(5),
  behavioral_score: z.number().min(0).max(5),
  leadership_score: z.number().min(0).max(5),
  comments: z.string().min(10, "Adicione comentários com pelo menos 10 caracteres"),
  strengths: z.string().min(10, "Descreva os pontos fortes"),
  areas_for_improvement: z.string().min(10, "Descreva as áreas de melhoria"),
  status: z.enum(["draft", "completed", "reviewed"]),
});

export function EvaluationForm({ onSuccess }: { onSuccess?: () => void }) {
  const { createEvaluation } = useEvaluations();
  
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members-for-evaluation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name
          )
        `);
      
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof evaluationSchema>>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      evaluated_user_id: "",
      period: "",
      overall_score: 3,
      technical_score: 3,
      behavioral_score: 3,
      leadership_score: 3,
      comments: "",
      strengths: "",
      areas_for_improvement: "",
      status: "draft",
    },
  });

  const onSubmit = (data: z.infer<typeof evaluationSchema>) => {
    createEvaluation(data as EvaluationInput);
    form.reset();
    onSuccess?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova Avaliação</CardTitle>
        <CardDescription>Preencha todos os campos para criar uma avaliação completa</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="evaluated_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colaborador</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o colaborador" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamMembers?.map((member: any) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.profiles.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Período</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Q1 2024, Janeiro 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="overall_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nota Geral: {field.value}</FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={5}
                        step={0.5}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="technical_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Técnica: {field.value}</FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={5}
                        step={0.5}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="behavioral_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comportamental: {field.value}</FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={5}
                        step={0.5}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadership_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Liderança: {field.value}</FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={5}
                        step={0.5}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="strengths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pontos Fortes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva os principais pontos fortes do colaborador..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="areas_for_improvement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Áreas de Melhoria</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva as áreas que precisam de desenvolvimento..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentários Gerais</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Adicione comentários gerais sobre o desempenho..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="reviewed">Revisada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Salvar Avaliação
              </Button>
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Limpar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

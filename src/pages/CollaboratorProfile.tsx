import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { User, Mail, Phone, Calendar, Briefcase, DollarSign, TrendingUp, FileText, Target } from "lucide-react";
import { EvaluationCard } from "@/components/EvaluationCard";
import { PDIReviewCard } from "@/components/PDIReviewCard";

export default function CollaboratorProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const { data: collaborator, isLoading } = useQuery({
    queryKey: ["collaborator-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      return data;
    },
  });

  const { data: teamMember } = useQuery({
    queryKey: ["team-member-info", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_members")
        .select("*, team:teams(name)")
        .eq("user_id", userId)
        .maybeSingle();

      return data;
    },
  });

  const { data: evaluations } = useQuery({
    queryKey: ["collaborator-evaluations", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluations")
        .select(`
          *,
          evaluator_user:profiles!evaluations_evaluator_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq("evaluated_user_id", userId)
        .order("created_at", { ascending: false });

      return data || [];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["collaborator-pdis", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("development_plans")
        .select(`
          *,
          approver:profiles!development_plans_approved_by_fkey(id, full_name, avatar_url)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      return data || [];
    },
  });

  const { data: oneOnOnes } = useQuery({
    queryKey: ["collaborator-11s", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("one_on_ones")
        .select(`
          *,
          leader:profiles!one_on_ones_leader_id_fkey(id, full_name, avatar_url)
        `)
        .eq("collaborator_id", userId)
        .order("scheduled_date", { ascending: false });

      return data || [];
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const averageScore = evaluations && evaluations.length > 0
    ? (evaluations.reduce((sum: number, e: any) => sum + e.overall_score, 0) / evaluations.length).toFixed(1)
    : "N/A";

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header onLogout={handleLogout} />
        <main className="flex-1 p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header do Perfil */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={collaborator?.avatar_url} />
                    <AvatarFallback className="text-2xl">
                      {collaborator?.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold">{collaborator?.full_name}</h1>
                    <p className="text-muted-foreground">{teamMember?.position || "Colaborador"}</p>
                    <div className="flex gap-2 mt-2">
                      {teamMember?.team && (
                        <Badge variant="outline">{teamMember.team.name}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {collaborator?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="text-sm font-medium">{collaborator.phone}</p>
                      </div>
                    </div>
                  )}
                  {collaborator?.department && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Departamento</p>
                        <p className="text-sm font-medium">{collaborator.department}</p>
                      </div>
                    </div>
                  )}
                  {collaborator?.hire_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Admissão</p>
                        <p className="text-sm font-medium">
                          {new Date(collaborator.hire_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Média Avaliações</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageScore}</div>
                  <p className="text-xs text-muted-foreground">De 5.0</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">PDIs Ativos</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {plans?.filter((p: any) => p.status === 'in_progress').length || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">1:1s Realizados</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {oneOnOnes?.filter((o: any) => o.status === 'completed').length || 0}
                  </div>
                </CardContent>
              </Card>

              {teamMember?.cost && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Custo Mensal</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {Number(teamMember.cost).toLocaleString('pt-BR')}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Tabs com Informações */}
            <Tabs defaultValue="evaluations" className="space-y-4">
              <TabsList>
                <TabsTrigger value="evaluations">Avaliações</TabsTrigger>
                <TabsTrigger value="pdis">PDIs</TabsTrigger>
                <TabsTrigger value="11s">1:1s</TabsTrigger>
              </TabsList>

              <TabsContent value="evaluations" className="space-y-4">
                {evaluations && evaluations.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {evaluations.map((evaluation: any) => (
                      <EvaluationCard
                        key={evaluation.id}
                        evaluation={evaluation}
                        onViewDetails={() => {}}
                        showEvaluator={true}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nenhuma avaliação registrada</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="pdis" className="space-y-4">
                {plans && plans.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {plans.map((plan: any) => (
                      <PDIReviewCard key={plan.id} pdi={plan} onViewDetails={() => navigate('/pdi')} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Target className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nenhum PDI criado</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="11s" className="space-y-4">
                {oneOnOnes && oneOnOnes.length > 0 ? (
                  <div className="space-y-4">
                    {oneOnOnes.map((meeting: any) => (
                      <Card key={meeting.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                {new Date(meeting.scheduled_date).toLocaleDateString('pt-BR')}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {meeting.duration_minutes} minutos
                              </p>
                            </div>
                            <Badge variant={meeting.status === 'completed' ? 'default' : 'secondary'}>
                              {meeting.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        {meeting.notes && (
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{meeting.notes}</p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nenhum 1:1 registrado</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
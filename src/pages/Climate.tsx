import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { useClimateSurveys } from "@/hooks/useClimateSurveys";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

export default function Climate() {
  const navigate = useNavigate();
  const { surveys } = useClimateSurveys();
  const { data: profile } = useUserProfile();

  const activeSurveys = surveys.filter(s => s.status === 'active');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header userName={profile?.full_name} onLogout={handleLogout} />
        <main className="flex-1 p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Clima Organizacional</h1>
              <p className="text-muted-foreground mt-1">Acompanhe as pesquisas de clima e o engajamento</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pesquisas Ativas</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeSurveys.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <EmptyState
                    title="Score e participação em breve"
                    message="Score médio e taxa de participação serão calculados a partir das respostas das pesquisas quando houver dados."
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Pesquisas</h2>
              {surveys.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground">Nenhuma pesquisa disponível no momento.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {surveys.map((survey) => (
                    <Card key={survey.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{survey.title}</CardTitle>
                            <CardDescription>{survey.description}</CardDescription>
                          </div>
                          <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>
                            {survey.status === 'active' ? 'Ativa' : survey.status === 'draft' ? 'Rascunho' : 'Encerrada'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            Período: {new Date(survey.start_date).toLocaleDateString()} - {new Date(survey.end_date).toLocaleDateString()}
                          </div>
                          {survey.status === 'active' && (
                            <Button className="w-full">Responder Pesquisa</Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

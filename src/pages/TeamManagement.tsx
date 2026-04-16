import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTeams } from "@/hooks/useTeams";
import { Plus, Trash2, Edit2, Users, UserPlus, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function TeamManagement() {
  const navigate = useNavigate();
  const {
    companies,
    teams,
    teamMembers,
    users,
    loading,
    createTeam,
    updateTeam,
    deleteTeam,
    assignLeaderToTeam,
    addMemberToTeam,
    removeMemberFromTeam,
  } = useTeams();
  const { data: profile } = useUserProfile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Team form state
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamCompany, setTeamCompany] = useState("");

  // Leader assignment state
  const [selectedTeamForLeader, setSelectedTeamForLeader] = useState("");
  const [selectedLeader, setSelectedLeader] = useState("");

  // Member assignment state
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedTeamForMember, setSelectedTeamForMember] = useState("");
  const [selectedMember, setSelectedMember] = useState("");
  const [memberPosition, setMemberPosition] = useState("");

  const handleSaveTeam = async () => {
    if (!teamName || !teamCompany) return;

    if (editingTeam) {
      await updateTeam(editingTeam, teamName, teamCompany);
    } else {
      await createTeam(teamName, teamCompany);
    }

    setTeamDialogOpen(false);
    setEditingTeam(null);
    setTeamName("");
    setTeamCompany("");
  };

  const handleEditTeam = (team: typeof teams[0]) => {
    setEditingTeam(team.id);
    setTeamName(team.name);
    setTeamCompany(team.company_id);
    setTeamDialogOpen(true);
  };

  const handleAssignLeader = async () => {
    if (!selectedTeamForLeader || !selectedLeader) {
      toast.error("Selecione um time e um líder");
      return;
    }
    
    try {
      await assignLeaderToTeam(selectedLeader, selectedTeamForLeader);
      setSelectedTeamForLeader("");
      setSelectedLeader("");
    } catch (error) {
      console.error("Erro ao atribuir líder:", error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeamForMember || !selectedMember) return;
    await addMemberToTeam(selectedMember, selectedTeamForMember, memberPosition);
    setMemberDialogOpen(false);
    setSelectedTeamForMember("");
    setSelectedMember("");
    setMemberPosition("");
  };

  const getTeamLeader = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team?.leader_id) return null;
    return users.find((u) => u.id === team.leader_id);
  };

  const getTeamMembers = (teamId: string) => {
    return teamMembers.filter((m) => m.team_id === teamId);
  };

  const leaders = users.filter((u) => u.role === "lider");
  const collaborators = users.filter((u) => u.role === "colaborador");

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header userName={profile?.full_name} onLogout={handleLogout} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Gerenciamento de Times</h1>
              <p className="text-muted-foreground">
                Gerencie times, líderes e colaboradores
              </p>
            </div>

            <Tabs defaultValue="teams" className="space-y-4">
              <TabsList>
                <TabsTrigger value="teams" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Times
                </TabsTrigger>
                <TabsTrigger value="leaders" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Líderes
                </TabsTrigger>
                <TabsTrigger value="members" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Colaboradores
                </TabsTrigger>
              </TabsList>

              {/* TEAMS TAB */}
              <TabsContent value="teams" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Times</CardTitle>
                      <CardDescription>Gerencie os times da organização</CardDescription>
                    </div>
                    <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={() => {
                          setEditingTeam(null);
                          setTeamName("");
                          setTeamCompany("");
                        }}>
                          <Plus className="mr-2 h-4 w-4" />
                          Novo Time
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editingTeam ? "Editar Time" : "Criar Novo Time"}
                          </DialogTitle>
                          <DialogDescription>
                            Preencha as informações do time
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Nome do Time</Label>
                            <Input
                              value={teamName}
                              onChange={(e) => setTeamName(e.target.value)}
                              placeholder="Ex: Time de Desenvolvimento"
                            />
                          </div>
                          <div>
                            <Label>Empresa</Label>
                            <Select value={teamCompany} onValueChange={setTeamCompany}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a empresa" />
                              </SelectTrigger>
                              <SelectContent>
                                {companies.map((company) => (
                                  <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setTeamDialogOpen(false)}
                              className="flex-1"
                            >
                              Cancelar
                            </Button>
                            <Button onClick={handleSaveTeam} className="flex-1">
                              Salvar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Líder</TableHead>
                          <TableHead>Membros</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teams.map((team) => {
                          const leader = getTeamLeader(team.id);
                          const members = getTeamMembers(team.id);
                          return (
                            <TableRow key={team.id}>
                              <TableCell className="font-medium">{team.name}</TableCell>
                              <TableCell>{team.company?.name}</TableCell>
                              <TableCell>
                                {leader ? (
                                  <Badge variant="secondary">{leader.full_name}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">Sem líder</span>
                                )}
                              </TableCell>
                              <TableCell>{members.length}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditTeam(team)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteTeam(team.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* LEADERS TAB */}
              <TabsContent value="leaders" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Atribuir Líderes</CardTitle>
                    <CardDescription>
                      Atribua um líder a um time
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Time</Label>
                        <Select
                          value={selectedTeamForLeader}
                          onValueChange={setSelectedTeamForLeader}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o time" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Líder</Label>
                        <Select value={selectedLeader} onValueChange={setSelectedLeader}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o líder" />
                          </SelectTrigger>
                          <SelectContent>
                            {leaders.map((leader) => (
                              <SelectItem key={leader.id} value={leader.id}>
                                {leader.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button onClick={handleAssignLeader} className="w-full">
                          Atribuir Líder
                        </Button>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">Times e Líderes</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Líder Atual</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teams.map((team) => {
                            const leader = getTeamLeader(team.id);
                            return (
                              <TableRow key={team.id}>
                                <TableCell className="font-medium">{team.name}</TableCell>
                                <TableCell>{team.company?.name}</TableCell>
                                <TableCell>
                                  {leader ? (
                                    <Badge variant="secondary">{leader.full_name}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground">Sem líder</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* MEMBERS TAB */}
              <TabsContent value="members" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Colaboradores</CardTitle>
                      <CardDescription>
                        Gerencie os colaboradores dos times
                      </CardDescription>
                    </div>
                    <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar Colaborador
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Colaborador ao Time</DialogTitle>
                          <DialogDescription>
                            Selecione o colaborador e o time
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Time</Label>
                            <Select
                              value={selectedTeamForMember}
                              onValueChange={setSelectedTeamForMember}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o time" />
                              </SelectTrigger>
                              <SelectContent>
                                {teams.map((team) => (
                                  <SelectItem key={team.id} value={team.id}>
                                    {team.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Colaborador</Label>
                            <Select value={selectedMember} onValueChange={setSelectedMember}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o colaborador" />
                              </SelectTrigger>
                              <SelectContent>
                                {collaborators.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Cargo (Opcional)</Label>
                            <Input
                              value={memberPosition}
                              onChange={(e) => setMemberPosition(e.target.value)}
                              placeholder="Ex: Desenvolvedor Frontend"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setMemberDialogOpen(false)}
                              className="flex-1"
                            >
                              Cancelar
                            </Button>
                            <Button onClick={handleAddMember} className="flex-1">
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Líder</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.map((member) => {
                          const team = teams.find((t) => t.id === member.team_id);
                          const user = users.find((u) => u.id === member.user_id);
                          const leader = users.find((u) => u.id === member.leader_id);
                          
                          return (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">
                                {user?.full_name || member.profile?.full_name}
                              </TableCell>
                              <TableCell>{team?.name}</TableCell>
                              <TableCell>
                                {member.position || (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {leader ? (
                                  <Badge variant="secondary">{leader.full_name}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">Sem líder</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMemberFromTeam(member.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

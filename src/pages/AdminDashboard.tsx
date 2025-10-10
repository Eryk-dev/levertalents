import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit } from "lucide-react";

type UserWithRole = {
  id: string;
  email: string;
  full_name: string;
  role: string | null;
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile } = useUserProfile();

  useEffect(() => {
    checkAuth();
    loadUsers();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (roleData?.role !== 'socio') {
      toast({
        title: "Acesso negado",
        description: "Apenas sócios podem acessar esta página.",
        variant: "destructive",
      });
      navigate('/');
    }
  };

  const loadUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

      const usersWithRoles = await Promise.all(
        (authUsers || []).map(async (user) => {
          const profile = profiles?.find(p => p.id === user.id);
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

          return {
            id: user.id,
            email: user.email || '',
            full_name: profile?.full_name || user.email || '',
            role: roleData?.role || null,
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: "Erro",
        description: "Selecione um usuário e uma role.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser);

      // Then insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser,
          role: selectedRole as any,
        });

      if (error) throw error;

      toast({
        title: "Role atribuída com sucesso!",
        description: "O usuário agora tem acesso à sua nova role.",
      });

      loadUsers();
      setSelectedUser("");
      setSelectedRole("");
    } catch (error: any) {
      toast({
        title: "Erro ao atribuir role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Role removida com sucesso!",
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao remover role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'socio':
        return 'default';
      case 'lider':
        return 'secondary';
      case 'rh':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'socio':
        return 'Sócio';
      case 'lider':
        return 'Líder';
      case 'rh':
        return 'RH';
      case 'colaborador':
        return 'Colaborador';
      default:
        return 'Sem role';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header userName={profile?.full_name || 'Admin'} onLogout={handleLogout} />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">Gerenciamento de Usuários</h1>
                <p className="text-muted-foreground">Atribua roles aos usuários do sistema</p>
              </div>
              <Button onClick={() => navigate("/admin/criar-usuario")}>
                <UserPlus className="mr-2 h-4 w-4" />
                Criar Novo Usuário
              </Button>
            </div>

            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-4">Atribuir Role</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Usuário</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="socio">Sócio</SelectItem>
                      <SelectItem value="lider">Líder</SelectItem>
                      <SelectItem value="rh">RH</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button onClick={handleAssignRole} className="w-full">
                    Atribuir Role
                  </Button>
                </div>
              </div>
            </div>

            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-4">Usuários Cadastrados</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRole(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
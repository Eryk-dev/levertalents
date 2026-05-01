import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import AdminDashboard from "./AdminDashboard";
import GestorDashboard from "./GestorDashboard";
import Index from "./Index";
import RHDashboard from "./RHDashboard";
import SocioDashboard from "./SocioDashboard";

type DashboardTab = {
  value: string;
  label: string;
  content: JSX.Element;
};

export default function Dashboard() {
  const { userRole } = useAuth();

  const tabs: DashboardTab[] = [
    {
      value: "actions",
      label: "Minhas ações",
      content: <Index />,
    },
  ];

  if (userRole === "lider") {
    tabs.push({ value: "leader", label: "Liderança", content: <GestorDashboard /> });
  }

  if (userRole === "rh") {
    tabs.push({ value: "rh", label: "RH", content: <RHDashboard /> });
  }

  if (userRole === "socio") {
    tabs.push({ value: "socio", label: "Sócio", content: <SocioDashboard /> });
  }

  if (userRole === "admin") {
    tabs.push({ value: "admin", label: "Admin", content: <AdminDashboard /> });
  }

  if (tabs.length === 1) return <Index />;

  return (
    <Tabs defaultValue="actions" className="animate-fade-in">
      <div className="px-5 pt-5 lg:px-7 max-w-[1400px] mx-auto">
        <TabsList aria-label="Abas do dashboard">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-0">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

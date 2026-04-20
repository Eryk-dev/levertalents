import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-24 bg-background">
      <div className="max-w-md text-center space-y-6">
        <p className="caption-label">Erro 404</p>
        <h1 className="page-display">Página não encontrada.</h1>
        <p className="text-muted-foreground">
          O endereço <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{location.pathname}</code> não existe ou foi movido. Volte para o início.
        </p>
        <Button asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o início
          </Link>
        </Button>
      </div>
    </div>
  );
}

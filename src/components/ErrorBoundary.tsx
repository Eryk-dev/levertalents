import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 py-24 bg-background">
          <div className="max-w-md text-center space-y-5">
            <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <p className="caption-label">Erro inesperado</p>
            <h1 className="text-2xl font-semibold tracking-tight">Algo deu errado nesta tela.</h1>
            <p className="text-muted-foreground text-sm">
              O erro foi registrado. Tente recarregar a página — se persistir, avise a equipe técnica.
            </p>
            {this.state.error?.message && (
              <pre className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md text-left overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={this.handleReset}>
                Tentar novamente
              </Button>
              <Button onClick={this.handleReload}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Recarregar
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

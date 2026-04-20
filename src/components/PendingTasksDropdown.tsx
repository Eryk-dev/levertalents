import {
  Bell,
  Calendar,
  ClipboardList,
  FileCheck,
  Target,
  Users,
  MessageSquare,
  CircleAlert,
  Briefcase,
  UserCheck,
  Sparkles,
  SparkleIcon,
  CheckCircle2,
  UserPlus,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePendingTasks, PendingTask } from "@/hooks/usePendingTasks";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const TASK_ICONS: Record<string, typeof Bell> = {
  evaluation: FileCheck,
  one_on_one: Calendar,
  climate_survey: MessageSquare,
  pdi_approval: ClipboardList,
  pdi_update: Target,
  action_item: Users,
  other: CircleAlert,
  hiring_job_approval: FileCheck,
  hiring_job_review: Briefcase,
  hiring_candidate_stage_change: ArrowRightLeft,
  hiring_interview_reminder: Calendar,
  hiring_final_decision: CheckCircle2,
  hiring_admission_followup: UserPlus,
  hiring_fit_cultural_received: Sparkles,
  hiring_fit_cultural_expired: SparkleIcon,
};

const TASK_ROUTES: Record<string, (task: PendingTask) => string> = {
  evaluation: () => "/avaliacoes",
  one_on_one: () => "/11s",
  climate_survey: () => "/clima",
  pdi_approval: () => "/pdi",
  pdi_update: () => "/pdi",
  action_item: () => "/11s",
  hiring_job_approval: (task) => task.related_id ? `/hiring/jobs/${task.related_id}` : "/hiring/jobs",
  hiring_job_review: () => "/hiring/jobs",
  hiring_candidate_stage_change: (task) => task.related_id ? `/hiring/candidates/${task.related_id}` : "/hiring/candidates",
  hiring_interview_reminder: (task) => task.related_id ? `/hiring/candidates/${task.related_id}` : "/hiring/candidates",
  hiring_final_decision: (task) => task.related_id ? `/hiring/candidates/${task.related_id}` : "/hiring/candidates",
  hiring_admission_followup: (task) => task.related_id ? `/hiring/candidates/${task.related_id}` : "/hiring/candidates",
  hiring_fit_cultural_received: (task) => task.related_id ? `/hiring/candidates/${task.related_id}` : "/hiring/candidates",
  hiring_fit_cultural_expired: (task) => task.related_id ? `/hiring/candidates/${task.related_id}` : "/hiring/candidates",
};

function TaskItem({ task, onNavigate }: { task: PendingTask; onNavigate: () => void }) {
  const Icon = TASK_ICONS[task.task_type] || CircleAlert;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const isUrgent = task.priority === "urgent" || task.priority === "high";

  return (
    <button
      onClick={onNavigate}
      className="w-full text-left px-3 py-3 hover:bg-muted transition-base rounded-md flex items-start gap-3 group"
    >
      <div
        className={cn(
          "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
          isUrgent ? "bg-status-red-soft text-status-red" : "bg-accent-soft text-accent-text",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium leading-tight line-clamp-2">{task.title}</p>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
        )}
        {task.due_date && (
          <p className={cn("text-xs", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
            {isOverdue ? "Atrasado · " : ""}
            {formatDistanceToNow(new Date(task.due_date), { locale: ptBR, addSuffix: true })}
          </p>
        )}
      </div>
    </button>
  );
}

export function PendingTasksDropdown() {
  const { data: tasks = [], isLoading } = usePendingTasks();
  const navigate = useNavigate();

  const count = tasks.length;
  const visible = tasks.slice(0, 6);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`${count} pendências`}>
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-accent text-[10px] font-semibold text-accent-foreground flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-3 py-2.5 flex items-center justify-between">
          <span>Suas pendências</span>
          {count > 0 && (
            <span className="text-xs text-muted-foreground font-normal">{count}</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto p-1">
          {isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : count === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm font-medium">Tudo em dia</p>
              <p className="text-xs text-muted-foreground mt-1">Sem tarefas pendentes no momento.</p>
            </div>
          ) : (
            visible.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onNavigate={() => {
                  const resolver = TASK_ROUTES[task.task_type];
                  const route = resolver ? resolver(task) : "/";
                  navigate(route);
                }}
              />
            ))
          )}
        </div>
        {count > visible.length && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
              + {count - visible.length} pendências adicionais
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

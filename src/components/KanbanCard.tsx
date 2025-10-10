import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Trash2, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface KanbanCardProps {
  plan: any;
  onDelete: (id: string) => void;
}

export function KanbanCard({ plan, onDelete }: KanbanCardProps) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => navigate(`/pdi`)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={plan.user?.avatar_url} />
                  <AvatarFallback>
                    {plan.user?.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {plan.user?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {plan.title}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(plan.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{plan.progress_percentage}%</span>
            </div>
            <Progress value={plan.progress_percentage} className="h-1" />
          </div>

          {plan.deadline && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Prazo: {new Date(plan.deadline).toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}

          <div className="pt-2">
            <Badge variant="outline" className="text-xs">
              {plan.development_area}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KanbanCard } from "./KanbanCard";
import { LucideIcon } from "lucide-react";

interface KanbanColumnProps {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  plans: any[];
  onDelete: (id: string) => void;
}

export function KanbanColumn({
  id,
  title,
  icon: Icon,
  color,
  plans,
  onDelete,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${color}`} />
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {plans.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[200px] rounded-lg p-2 transition-colors ${
          isOver ? "bg-accent/50" : ""
        }`}
      >
        <SortableContext items={plans.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {plans.length > 0 ? (
            plans.map((plan) => (
              <KanbanCard key={plan.id} plan={plan} onDelete={onDelete} />
            ))
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Icon className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Nenhum PDI neste status
                </p>
              </CardContent>
            </Card>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

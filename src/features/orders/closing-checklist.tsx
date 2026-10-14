import { CheckCircle2, Circle } from "lucide-react";
import { InsetGroup } from "@/components/common/inset-group";
import { cn } from "@/lib/utils";

export type ClosingStep = { key: string; label: string; done: boolean; hint?: string };

/**
 * «Что осталось до закрытия» (UX-04): вместо второго таймлайна — короткий список условий закрытия сделки.
 * Состояние передаётся значком и текстом, не только цветом.
 */
export function ClosingChecklist({ steps }: { steps: ClosingStep[] }) {
  const left = steps.filter((s) => !s.done).length;
  return (
    <InsetGroup header="Что осталось до закрытия" footer={left === 0 ? "Все условия выполнены." : `Осталось шагов: ${left}.`}>
      <ul className="[&>li+li]:hairline-t" data-testid="closing-checklist">
        {steps.map((s) => (
          <li key={s.key} className="flex items-start gap-2.5 px-4 py-2.5" data-done={s.done ? "true" : "false"}>
            {s.done ? (
              <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            <span className="min-w-0">
              <span className={cn("text-body block", s.done && "text-muted-foreground")}>
                {s.label}
                <span className="sr-only">{s.done ? " — выполнено" : " — не выполнено"}</span>
              </span>
              {!s.done && s.hint && <span className="text-footnote text-muted-foreground block">{s.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </InsetGroup>
  );
}

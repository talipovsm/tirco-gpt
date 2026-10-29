import * as React from "react";
import { cn } from "@/lib/utils";

/** Bounded work surface with a clear header, body and optional action footer. */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("bg-card text-card-foreground shadow-panel border-border rounded-lg border", className)} {...props} />;
}
/** Интерактивный блок (ссылка/кнопка): подсветка фона при наведении и нажатии. */
const cardInteractive =
  "transition-[background-color,border-color,box-shadow] duration-(--duration-micro) hover:border-primary/35 hover:bg-surface-secondary active:bg-muted";
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 px-5 pt-5 pb-4", className)} {...props} />;
}
/** Заголовок блока — h2 (не пропускает уровень после h1 страницы). */
function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-title3", className)} {...props} />;
}
function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-muted-foreground text-subheadline", className)} {...props} />;
}
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("bg-surface-secondary flex flex-wrap items-center gap-3 rounded-b-lg border-t px-5 py-4", className)} {...props} />
  );
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, cardInteractive, CardTitle };

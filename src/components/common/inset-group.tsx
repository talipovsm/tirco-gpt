import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { cn } from "@/lib/utils";

/** A complete information panel: header and optional action, readable rows, contextual footer. */
export function InsetGroup({
  header,
  footer,
  action,
  className,
  children,
  as: Tag = "section",
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  as?: "section" | "div";
}) {
  return (
    <Tag className={cn("bg-card shadow-panel border-border min-w-0 overflow-hidden rounded-lg border", className)}>
      {(header || action) && (
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          {header && <h2 className="text-headline">{header}</h2>}
          {action && <div className="text-callout shrink-0">{action}</div>}
        </div>
      )}
      <div className="min-w-0">{children}</div>
      {footer && <div className="bg-surface-secondary text-footnote text-muted-foreground border-t px-5 py-3">{footer}</div>}
    </Tag>
  );
}

/** Panel rows share full-width dividers rather than inset settings-style separators. */
export function InsetList({ className, children }: { className?: string; children: React.ReactNode }) {
  return <ul className={cn("[&>li+li]:border-t", className)}>{children}</ul>;
}

/** Строка списка: значок слева, заголовок и подзаголовок, значение справа, шеврон для перехода. */
export function ListRow({
  title,
  subtitle,
  value,
  leading,
  href,
  onClick,
  className,
  testId,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  leading?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  testId?: string;
}) {
  const interactive = Boolean(href || onClick);
  const body = (
    <>
      {leading && <span className="text-muted-foreground flex shrink-0 items-center">{leading}</span>}
      <span data-row-content className="flex min-w-0 flex-1 items-center gap-4 py-3.5 pr-5">
        <span className="min-w-0 flex-1">
          <span className="text-muted-foreground block">{title}</span>
          {subtitle && <span className="text-subheadline text-muted-foreground mt-0.5 block truncate">{subtitle}</span>}
        </span>
        {value !== undefined && (
          <span className="text-foreground max-w-[65%] min-w-0 text-right font-medium [overflow-wrap:anywhere]">{value}</span>
        )}
        {interactive && <ChevronRight className="text-tertiary-foreground size-4 shrink-0" aria-hidden />}
      </span>
    </>
  );
  const cls = cn(
    "flex min-h-13 items-stretch gap-3 pl-5 text-left",
    interactive && "hover:bg-fill-quaternary active:bg-fill-tertiary w-full transition-colors duration-(--duration-micro)",
    className,
  );
  return (
    <li>
      {href ? (
        <Link href={href} className={cls} data-testid={testId}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cls} data-testid={testId}>
          {body}
        </button>
      ) : (
        <div className={cls} data-testid={testId}>
          {body}
        </div>
      )}
    </li>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

/** Единый ввод для форм профиля, регистрации и настроек. */
export const rowInput =
  "min-h-12 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 py-3 text-base text-foreground outline-none lg:text-[15px] transition-shadow placeholder:text-tertiary-foreground focus:border-primary focus:ring-3 focus:ring-primary/10 read-only:text-muted-foreground";

/** Нативный список внутри строки формы: без рамки, двойная стрелка справа. */
export const rowSelect = cn(
  rowInput,
  "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235c6b82%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:0.9rem] bg-[right_1rem_center] bg-no-repeat pr-10",
);

/**
 * Группа вертикальных полей с видимыми подписями и пояснением.
 */
export function FormGroup({
  header,
  footer,
  className,
  children,
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {header && <p className="mb-4 text-base font-semibold">{header}</p>}
      <div className="space-y-5">{children}</div>
      {footer && <div className="text-muted-foreground mt-3 text-xs leading-6">{footer}</div>}
    </div>
  );
}

/** Строка формы: подпись слева, поле справа; ошибка — под строкой, связана через aria-describedby. */
export function FormRow({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const child = React.cloneElement(children, {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": required || undefined,
  });
  return (
    <div>
      <div data-row-content>
        <div className="space-y-2">
          <label htmlFor={id} className={cn("block text-[13px] font-semibold", error && "text-danger")}>
            {label}
          </label>
          <div className="min-w-0 flex-1">{child}</div>
        </div>
        {hint && !error && (
          <p id={`${id}-hint`} className="text-muted-foreground mt-2 text-xs leading-5">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} role="alert" className="animate-rise-in text-danger mt-2 text-xs font-medium">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

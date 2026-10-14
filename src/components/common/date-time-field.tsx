"use client";
import { CalendarDays } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Поля даты и времени в формате интерфейса (UX-05): ДД.ММ.ГГГГ и ЧЧ:ММ (24 ч) независимо от языка браузера.
 * Значение для формы — ISO: «ГГГГ-ММ-ДД» и «ЧЧ:ММ», пустая строка — не указано. Календарь — системный, по кнопке.
 */

function isoToDisplayDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : "";
}

function maskDate(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join(".");
}

/** «ДД.ММ.ГГГГ» → ISO или null, если дата неполная или не существует. */
export function parseDisplayDate(text: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function maskTime(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

/** «ЧЧ:ММ» → то же значение или null, если время неполное или некорректное. */
export function parseDisplayTime(text: string): string | null {
  const m = /^(\d{2}):(\d{2})$/.exec(text);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return text;
}

type FieldProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Текст поля и значение формы. Неполный или неверный ввод передаёт в форму пустое значение (обязательность и ошибки
 * проверяет форма), но текст пользователя сохраняется; изменение значения извне (календарь, сброс формы) — показывается.
 */
function useDisplay(value: string, toDisplay: (v: string) => string, onChange: (v: string) => void) {
  const [text, setText] = React.useState(() => toDisplay(value));
  // Последнее известное значение (из формы или переданное нами): другое значение пришло извне
  const [seen, setSeen] = React.useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(toDisplay(value));
  }
  const emit = (nextText: string, parsed: string | null) => {
    const v = parsed ?? "";
    setText(nextText);
    setSeen(v);
    if (v !== value) onChange(v);
  };
  return [text, emit] as const;
}

export function DateInput({ id, name, value, onChange, onBlur, disabled, className, ...aria }: FieldProps) {
  const [text, emit] = useDisplay(value, isoToDisplayDate, onChange);
  const picker = React.useRef<HTMLInputElement>(null);
  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        name={name}
        inputMode="numeric"
        autoComplete="off"
        placeholder="ДД.ММ.ГГГГ"
        value={text}
        disabled={disabled}
        onBlur={onBlur}
        className="pr-10 lg:pr-9"
        onChange={(e) => {
          const next = maskDate(e.target.value);
          emit(next, parseDisplayDate(next));
        }}
        {...aria}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label="Выбрать дату в календаре"
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-sm lg:size-7"
        onClick={() => {
          const el = picker.current;
          if (!el) return;
          el.value = value;
          if (typeof el.showPicker === "function") el.showPicker();
          else el.click();
        }}
      >
        <CalendarDays className="size-4" aria-hidden />
      </button>
      {/* Системный календарь — только для выбора; отображение и ввод — в поле выше */}
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 size-px opacity-0"
        onChange={(e) => emit(isoToDisplayDate(e.target.value), e.target.value || null)}
      />
    </div>
  );
}

export function TimeInput({ id, name, value, onChange, onBlur, disabled, className, ...aria }: FieldProps) {
  const [text, emit] = useDisplay(value, (v) => v ?? "", onChange);
  return (
    <Input
      id={id}
      name={name}
      inputMode="numeric"
      autoComplete="off"
      placeholder="ЧЧ:ММ"
      value={text}
      disabled={disabled}
      onBlur={onBlur}
      className={className}
      onChange={(e) => {
        const next = maskTime(e.target.value);
        emit(next, parseDisplayTime(next));
      }}
      {...aria}
    />
  );
}

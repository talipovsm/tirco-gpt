import * as React from "react";
import { cn } from "@/lib/utils";

/** Clear bounded inputs; 16px mobile text prevents browser zoom while editing. */
const field =
  "w-full min-w-0 rounded-md border border-input bg-card text-base text-foreground shadow-control transition-[border-color,box-shadow] duration-(--duration-micro) hover:border-border-strong focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:outline-danger/55 lg:text-body";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(field, "file:text-callout flex h-11 px-3.5 file:mr-3 file:border-0 file:bg-transparent file:font-semibold", className)}
    {...props}
  />
));
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(field, "flex min-h-28 px-3.5 py-3", className)} {...props} />
));
Textarea.displayName = "Textarea";

/** Native select keeps keyboard navigation and platform form semantics. */
const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      field,
      "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2368778e%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] flex h-11 appearance-none bg-[length:1rem] bg-[right_0.8rem_center] bg-no-repeat pr-10 pl-3.5",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
NativeSelect.displayName = "NativeSelect";

export { Input, NativeSelect, Textarea };

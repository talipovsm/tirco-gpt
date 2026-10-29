import { Search } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Bounded search control; its visual weight matches the filter inputs. */
export const SearchField = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { wrapperClassName?: string }>(
  ({ className, wrapperClassName, ...props }, ref) => (
    <div className={cn("relative min-w-0", wrapperClassName)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" aria-hidden />
      <input
        ref={ref}
        type="search"
        className={cn(
          "bg-card text-foreground lg:text-body border-input shadow-control focus:border-primary h-11 w-full min-w-0 rounded-md border pr-3.5 pl-10 text-base transition-colors [&::-webkit-search-cancel-button]:opacity-60",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
SearchField.displayName = "SearchField";

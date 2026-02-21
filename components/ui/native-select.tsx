/* eslint-disable jsx-a11y/control-has-associated-label */
import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type NativeSelectProps = Omit<
  React.ComponentPropsWithoutRef<"select">,
  "size"
> & {
  size?: "sm" | "default"
}

const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  NativeSelectProps
>(function NativeSelect(
  { className, size = "default", id, children, ...props },
  ref
) {
  const generatedId = React.useId()
  const selectId = id ?? generatedId

  return (
    <div
      className="group relative w-full"
      data-slot="native-select-wrapper"
    >
      {/* Accessible label fallback */}
      <label htmlFor={selectId} className="sr-only">
        Select an option
      </label>

      <select
        ref={ref}
        id={selectId}
        data-slot="native-select"
        data-size={size}
        className={cn(
          // Base
          "border-input bg-transparent dark:bg-input/30 dark:hover:bg-input/50",
          "placeholder:text-muted-foreground",
          "selection:bg-primary selection:text-primary-foreground",
          "shadow-xs outline-none transition-[color,box-shadow]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",

          // Layout
          "w-full min-w-[140px] appearance-none rounded-md border",
          "pl-3 pr-10",
          "text-sm",

          // Sizes
          "h-9 py-2 data-[size=sm]:h-8 data-[size=sm]:py-1",

          // Focus
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",

          // Invalid
          "aria-invalid:border-destructive",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",

          className
        )}
        aria-label={props["aria-label"] ?? "Select an option"}
        {...props}
      >
        {children}
      </select>

      {/* Chevron Icon */}
      <ChevronDownIcon
        className={cn(
          "text-muted-foreground pointer-events-none select-none",
          "absolute right-3 top-1/2 -translate-y-1/2",
          "size-4 opacity-70",
          "group-focus-within:opacity-100"
        )}
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
})

function NativeSelectOption(
  props: React.ComponentPropsWithoutRef<"option">
) {
  return <option data-slot="native-select-option" {...props} />
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn(className)}
      {...props}
    />
  )
}

export {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
}

"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/**
 * Single-date picker (shadcn Calendar in a Popover) used everywhere a date is
 * chosen. Its value contract is a plain `YYYY-MM-DD` string — byte-identical to
 * what a native `<input type="date">` submits — so server actions and Zod
 * `z.coerce.date()` parsing are unchanged.
 *
 * Pass `name` to drop a hidden input for `<form action>` / Server Action forms
 * (uncontrolled: seed with `defaultValue`). Or drive it from React state with
 * `value` + `onValueChange`. ISO `min`/`max` clamp navigation and grey out
 * out-of-range days; they compare lexically, exactly like the old `min` attr.
 */

const ISO = "yyyy-MM-dd"

function parseISO(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = parse(value, ISO, new Date())
  return isValid(d) ? d : undefined
}

function toISO(date: Date | undefined): string {
  return date ? format(date, ISO) : ""
}

type DatePickerProps = {
  /** Controlled ISO value (`YYYY-MM-DD`). Omit for uncontrolled / form use. */
  value?: string
  /** Uncontrolled initial ISO value. */
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Emits a hidden `<input name>` carrying the ISO value for Server Actions. */
  name?: string
  /** Associates an external `<Label htmlFor>` with the trigger. */
  id?: string
  placeholder?: string
  disabled?: boolean
  /** Inclusive ISO bounds (`YYYY-MM-DD`). */
  min?: string
  max?: string
  /**
   * Month/year caption. `"dropdown"` (fast jumps) only makes sense with a
   * bounded range — e.g. a birthday with both `min` and `max`. Defaults to
   * `"label"` + chevron nav, which is correct for open-ended ranges.
   */
  captionLayout?: React.ComponentProps<typeof Calendar>["captionLayout"]
  "aria-invalid"?: boolean
  className?: string
}

export function DatePicker({
  value,
  defaultValue,
  onValueChange,
  name,
  id,
  placeholder = "Pick a date",
  disabled,
  min,
  max,
  captionLayout = "label",
  "aria-invalid": ariaInvalid,
  className,
}: DatePickerProps) {
  const isControlled = value !== undefined
  const [internal, setInternal] = React.useState(defaultValue ?? "")
  const iso = isControlled ? value : internal
  const [open, setOpen] = React.useState(false)

  const selected = parseISO(iso)
  const minDate = parseISO(min)
  const maxDate = parseISO(max)

  function commit(date: Date | undefined) {
    const next = toISO(date)
    if (!isControlled) setInternal(next)
    onValueChange?.(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        data-empty={!selected}
        className={cn(
          "flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-left text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[empty=true]:text-muted-foreground md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">
          {selected ? format(selected, "d MMM yyyy") : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto"
        aria-label="Choose a date"
      >
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          defaultMonth={selected ?? maxDate}
          onSelect={commit}
          startMonth={minDate}
          endMonth={maxDate}
          captionLayout={captionLayout}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
        />
      </PopoverContent>
      {name ? <input type="hidden" name={name} value={iso} /> : null}
    </Popover>
  )
}

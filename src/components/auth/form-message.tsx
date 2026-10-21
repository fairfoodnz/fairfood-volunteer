import { cn } from "@/lib/utils";

/**
 * A form-level message inside a live region that is always in the DOM.
 * Screen readers often miss a live region that is created at the same moment
 * as its text, so the container renders empty (and visually hidden) up front
 * and only its content changes. Errors use `role="alert"`, successes
 * `role="status"`; never both on one element.
 */
export function FormMessage({
  tone,
  message,
  children,
  className,
  id,
}: {
  tone: "error" | "success";
  /** The text to announce; falsy renders the empty region. */
  message?: string | null | false;
  /** Extra content shown with the message (e.g. a recovery link). */
  children?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const shown = Boolean(message);
  return (
    <div
      id={id}
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "space-y-1 text-sm",
        tone === "error" ? "text-destructive" : "font-medium text-leaf-deep",
        !shown && "sr-only",
        className,
      )}
    >
      {shown ? (
        <>
          <p>{message}</p>
          {children}
        </>
      ) : null}
    </div>
  );
}

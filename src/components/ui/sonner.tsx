"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  // Light only: the site has no dark theme, so following the OS setting
  // would drop dark toasts onto the cream page.
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          // `richColors` mapped onto brand tokens (text pairs are ≥4.5:1).
          "--success-bg": "var(--card)",
          "--success-text": "var(--ff-green-deep)",
          "--success-border": "color-mix(in oklab, var(--ff-green) 40%, transparent)",
          "--error-bg": "var(--card)",
          "--error-text": "var(--destructive)",
          "--error-border": "color-mix(in oklab, var(--destructive) 40%, transparent)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

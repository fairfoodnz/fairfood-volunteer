"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSiteCopyAction, type SiteCopyState } from "./actions";

export type CopyFieldView = {
  key: string;
  label: string;
  help: string;
  multiline: boolean;
  maxLength: number;
  fallback: string;
  /** The coordinator's saved override — empty string means "using the default". */
  value: string;
};

export type CopySectionView = {
  id: string;
  title: string;
  description: string;
  fields: CopyFieldView[];
};

export function SiteCopyForm({ sections }: { sections: CopySectionView[] }) {
  const [state, action, pending] = useActionState<SiteCopyState, FormData>(
    saveSiteCopyAction,
    {},
  );
  const fe = state.fieldErrors ?? {};

  // Controlled so "Use the default wording" can empty a box in one click, and
  // so the character counter tracks what's actually in it.
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      sections.flatMap((s) => s.fields.map((f) => [f.key, f.value])),
    ),
  );

  useEffect(() => {
    if (state.ok) toast.success("Wording saved. Volunteers see it right away.");
  }, [state]);

  return (
    <form action={action} className="space-y-8">
      {sections.map((section) => (
        <section
          key={section.id}
          className="rounded-md border border-border bg-card p-6 md:p-8"
        >
          <h2 className="display text-xl font-semibold">{section.title}</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-foreground/70">
            {section.description}
          </p>

          <div className="mt-6 space-y-6">
            {section.fields.map((field) => {
              const value = values[field.key] ?? "";
              const usingDefault = value.trim().length === 0;
              const error = fe[field.key as keyof typeof fe];
              return (
                <div key={field.key} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    {usingDefault ? (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                        Using the default
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setValues((v) => ({ ...v, [field.key]: "" }))
                        }
                        className="text-xs font-semibold text-leaf-deep underline-offset-4 hover:underline"
                      >
                        Use the default wording
                      </button>
                    )}
                  </div>

                  {field.multiline ? (
                    <Textarea
                      id={field.key}
                      name={field.key}
                      rows={4}
                      value={value}
                      placeholder={field.fallback}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.key]: e.target.value }))
                      }
                      aria-invalid={error ? true : undefined}
                      aria-describedby={`${field.key}-help`}
                      className="resize-y"
                    />
                  ) : (
                    <Input
                      id={field.key}
                      name={field.key}
                      value={value}
                      placeholder={field.fallback}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.key]: e.target.value }))
                      }
                      aria-invalid={error ? true : undefined}
                      aria-describedby={`${field.key}-help`}
                      className="h-11"
                    />
                  )}

                  {error && (
                    <p
                      role="alert"
                      aria-live="polite"
                      className="text-sm text-destructive"
                    >
                      {error}
                    </p>
                  )}

                  <p
                    id={`${field.key}-help`}
                    className="flex items-start gap-x-4 text-xs text-foreground/55"
                  >
                    <span className="min-w-0 flex-1">
                      {field.help} Leave it empty to use the default.
                    </span>
                    <span className="shrink-0 font-mono tabular-nums">
                      {value.trim().length}/{field.maxLength}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="bg-leaf hover:bg-leaf-deep"
        >
          {pending ? "Saving…" : "Save wording"}
        </Button>
      </div>
    </form>
  );
}

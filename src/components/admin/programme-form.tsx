"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { slugify, programmeImageSrc } from "@/lib/programs";
import { PROGRAMME_THEMES, THEME_KEYS } from "@/lib/programme-theme";
import {
  createProgramme,
  updateProgramme,
  type ProgrammeFormState,
} from "@/app/admin/programmes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

type ProgrammeRecord = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  location: string;
  contactEmail: string | null;
  contactPhone: string | null;
  gettingHere: string | null;
  theme: string;
  order: number;
  active: boolean;
  imageUrl: string | null;
  imageKey: string | null;
};

const INITIAL: ProgrammeFormState = {};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function ProgrammeForm({ program }: { program?: ProgrammeRecord }) {
  const isEdit = Boolean(program);
  const router = useRouter();

  const [title, setTitle] = useState(program?.title ?? "");
  const [theme, setTheme] = useState(program?.theme ?? "cream");
  const [active, setActive] = useState(program?.active ?? true);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const action = isEdit ? updateProgramme : createProgramme;

  const [state, formAction, pending] = useActionState(
    async (prev: ProgrammeFormState, fd: FormData) => {
      const result = await action(prev, fd);
      // createProgramme redirects on success, so we only land back here on
      // error (create) or on either outcome (update).
      if (result.ok) {
        toast.success("Programme saved.");
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
      return result;
    },
    INITIAL,
  );

  // Mirrors the server: slug is re-derived from the title (and stays stable on
  // edit unless the title changes). Suffixes for collisions are added server-side.
  const baseSlug = slugify(title) || "programme";
  const slugPreview =
    isEdit && program && title === program.title ? program.slug : baseSlug;

  const currentImage = program
    ? programmeImageSrc(program)
    : null;

  function pickImage(file: File | null) {
    setLocalError(null);
    setNewImage(null);
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError("That image is bigger than 5 MB — please compress it.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    if (!IMAGE_ACCEPT.split(",").includes(file.type)) {
      setLocalError("Images must be JPEG, PNG, WebP or GIF.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    setNewImage(URL.createObjectURL(file));
  }

  const error = localError ?? (!state.ok ? state.error : null) ?? null;

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="id" value={program!.id} />}
      {active && <input type="hidden" name="active" value="1" />}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-tomato/40 bg-tomato/10 px-4 py-3 text-sm text-tomato"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* ---- Left: copy ---- */}
        <div className="space-y-5 rounded-md border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pack Kai Boxes"
              className="h-11"
            />
            <p className="font-mono text-[11px] text-foreground/55">
              URL: <span className="text-foreground/80">/programs/{slugPreview}</span>
              {isEdit && title !== program?.title && (
                <span className="ml-1 text-tomato">
                  — changing the title changes the public link
                </span>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              name="tagline"
              required
              maxLength={80}
              defaultValue={program?.tagline ?? ""}
              placeholder="Sort, pack, share"
              className="h-11"
            />
            <p className="text-xs text-foreground/55">
              Short eyebrow shown on every programme card.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              required
              maxLength={2000}
              rows={5}
              defaultValue={program?.description ?? ""}
              placeholder="What volunteers will actually be doing…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Address</Label>
            <Input
              id="location"
              name="location"
              maxLength={200}
              defaultValue={program?.location ?? ""}
              placeholder="624 Rosebank Road, Avondale, Tāmaki Makaurau"
              className="h-11"
            />
            <p className="text-xs text-foreground/55">
              Leave blank to use the Avondale home base.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gettingHere">Getting here</Label>
            <Textarea
              id="gettingHere"
              name="gettingHere"
              maxLength={1000}
              rows={3}
              defaultValue={program?.gettingHere ?? ""}
              placeholder="Free street parking. Five-minute walk from Avondale station."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                maxLength={160}
                defaultValue={program?.contactEmail ?? ""}
                placeholder="kiaora@fairfood.org.nz"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                maxLength={40}
                defaultValue={program?.contactPhone ?? ""}
                placeholder="(09) 555-1234"
                className="h-11"
              />
            </div>
          </div>
        </div>

        {/* ---- Right: presentation ---- */}
        <div className="space-y-5 rounded-md border border-border bg-card p-6">
          <div className="space-y-2">
            <Label>Card theme</Label>
            <div className="grid grid-cols-2 gap-2">
              {THEME_KEYS.map((key) => {
                const t = PROGRAMME_THEMES[key];
                const selected = theme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                      selected
                        ? "border-leaf ring-2 ring-leaf/30"
                        : "border-border hover:border-foreground/35",
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-6 shrink-0 rounded-full border border-black/10"
                      style={{ background: t.swatch }}
                    />
                    <span className="font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="theme" value={theme} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image</Label>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-border bg-cream-deep">
              {newImage || currentImage ? (
                <Image
                  src={newImage ?? currentImage!}
                  alt="Programme image preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-center text-xs text-foreground/55">
                  No image yet
                </div>
              )}
            </div>
            <input
              ref={imageInputRef}
              id="image"
              name="image"
              type="file"
              accept={IMAGE_ACCEPT}
              onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-foreground/70 file:mr-3 file:rounded-md file:border-0 file:bg-leaf file:px-3 file:py-2 file:text-sm file:font-semibold file:text-cream hover:file:bg-leaf-deep"
            />
            <p className="text-xs text-foreground/55">
              JPEG · PNG · WebP · GIF, up to 5 MB.
              {isEdit && " Leave empty to keep the current image."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="order">Display order</Label>
              <Input
                id="order"
                name="order"
                type="number"
                min={0}
                max={9999}
                defaultValue={program?.order ?? 0}
                className="h-11"
              />
              <p className="text-xs text-foreground/55">
                Lower numbers show first.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <label className="flex h-11 items-center gap-2.5 rounded-md border border-border px-3 text-sm">
                <Checkbox
                  checked={active}
                  onCheckedChange={(v) => setActive(Boolean(v))}
                />
                <span>{active ? "Live on the site" : "Hidden (draft)"}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push("/admin/programmes")}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={pending}
          className="bg-leaf hover:bg-leaf-deep"
        >
          {pending
            ? "Saving…"
            : isEdit
              ? "Save changes"
              : "Create programme"}
        </Button>
      </div>
    </form>
  );
}

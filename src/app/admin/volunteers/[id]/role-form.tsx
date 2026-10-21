"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { setVolunteerRoleAction } from "../actions";

/**
 * Grant or remove admin access. Either way it's a privilege change, so it goes
 * through a confirm that spells out the consequence before anything happens.
 */
export function RoleForm({
  userId,
  name,
  isAdmin,
}: {
  userId: string;
  name: string;
  isAdmin: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-sm">
        {isAdmin ? (
          <>
            <span className="font-semibold">{name}</span> is currently an
            admin. Removing access locks them out of{" "}
            <code className="rounded bg-foreground/10 px-1 text-xs">/admin</code>{" "}
            straight away.
          </>
        ) : (
          <>
            Make <span className="font-semibold">{name}</span> an admin.
            They&rsquo;ll be able to manage rosters, documents, and other
            volunteers.
          </>
        )}
      </p>
      <div className="mt-3 flex justify-end">
        <ConfirmDialog
          trigger={
            <Button size="sm" variant={isAdmin ? "destructive" : "outline"}>
              {isAdmin ? "Remove admin" : "Make admin"}
            </Button>
          }
          tone={isAdmin ? "destructive" : "default"}
          title={isAdmin ? `Remove ${name}'s admin access?` : `Make ${name} an admin?`}
          description={
            isAdmin
              ? "They lose access to every /admin page immediately, including rosters, volunteer profiles and disclosures. Their own volunteer account and bookings stay as they are."
              : "They'll be able to see every volunteer's profile and disclosures, change rosters and documents, impersonate volunteers, and give or remove admin access for others."
          }
          confirmLabel={isAdmin ? "Remove admin access" : "Make admin"}
          pendingLabel="Saving…"
          fields={{ userId, role: isAdmin ? "VOLUNTEER" : "ADMIN" }}
          action={async (formData) => {
            const result = await setVolunteerRoleAction(formData);
            if (result.ok) {
              toast.success(
                isAdmin ? `${name} is no longer an admin.` : `${name} is now an admin.`,
              );
            } else {
              toast.error(result.error);
            }
          }}
        />
      </div>
    </div>
  );
}

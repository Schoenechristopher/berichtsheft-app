"use client";

import { useActionState, useState } from "react";
import { CHANNELS, CHANNEL_LABELS, NO_CHANNEL_WARNING, type Channel } from "@/domain/notifications";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { ChannelsFormState } from "@/app/(app)/einstellungen/actions";

const HINTS: Record<Channel, string> = {
  EMAIL: "Nachricht an Ihre Firmen-E-Mail.",
  TEAMS: "Nachricht in Microsoft Teams (in der Demo im Teams-Postfach).",
  APP: "Zähler an der Glocke oben in der App.",
};

/**
 * Kanäle für Benachrichtigungen (AK-1011): drei Schalter E-Mail, Teams, App mit je einem Satz
 * Erklärung, beliebig kombinierbar, auch keiner – dann mit Warnleiste (AK-1013).
 */
export function ChannelSettingsForm({
  action,
  channels,
}: {
  action: (prev: ChannelsFormState, formData: FormData) => Promise<ChannelsFormState>;
  channels: readonly Channel[];
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [selected, setSelected] = useState<readonly Channel[]>(channels);
  const toggle = (channel: Channel, checked: boolean) =>
    setSelected((current) => (checked ? [...current, channel] : current.filter((value) => value !== channel)));

  return (
    <form action={formAction} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="sr-only">Benachrichtigungen erhalten per</legend>
        {CHANNELS.map((channel) => {
          const checked = selected.includes(channel);
          return (
            <label
              key={channel}
              className="border-border hover:bg-surface-muted flex cursor-pointer items-start justify-between gap-4 rounded-md border p-3"
            >
              <span className="min-w-0">
                <span id={`channel-${channel}-label`} className="block font-medium">
                  {CHANNEL_LABELS[channel]}
                </span>
                <span id={`channel-${channel}-hint`} className="text-fg-muted block text-sm">
                  {HINTS[channel]}
                </span>
              </span>
              <span className="relative inline-flex shrink-0 items-center">
                <input
                  type="checkbox"
                  role="switch"
                  name="channels"
                  value={channel}
                  checked={checked}
                  onChange={(event) => toggle(channel, event.target.checked)}
                  aria-labelledby={`channel-${channel}-label`}
                  aria-describedby={`channel-${channel}-hint`}
                  className="peer border-border-strong bg-surface-muted checked:border-accent checked:bg-accent h-7 w-12 cursor-pointer appearance-none rounded-full border-2 transition-colors"
                />
                <span
                  aria-hidden="true"
                  className="bg-fg-muted peer-checked:bg-on-accent pointer-events-none absolute top-1 left-1 h-5 w-5 rounded-full transition-transform peer-checked:translate-x-5"
                />
              </span>
            </label>
          );
        })}
      </fieldset>
      {selected.length === 0 ? (
        <Notice tone="warning" role="alert" testId="no-channel-warning" title="Kein Kanal gewählt.">
          <p>{NO_CHANNEL_WARNING}</p>
        </Notice>
      ) : null}
      {state?.ok ? <Notice tone="success">{state.message}</Notice> : null}
      {state && !state.ok ? <Notice tone="error">{state.formError}</Notice> : null}
      <Button
        type="submit"
        variant="primary"
        pending={pending}
        pendingLabel="Wird gespeichert …"
        className="w-full sm:w-auto"
      >
        Kanäle speichern
      </Button>
    </form>
  );
}

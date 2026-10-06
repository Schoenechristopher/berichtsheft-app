"use client";

import { useActionState, useState } from "react";
import { CHANNELS, CHANNEL_LABELS, NO_CHANNEL_WARNING, type Channel } from "@/domain/notifications";
import { Notice, primaryButtonClass } from "@/components/ui";
import type { ChannelsFormState } from "@/app/(app)/einstellungen/actions";

const HINTS: Record<Channel, string> = {
  EMAIL: "an Ihre Firmen-E-Mail",
  TEAMS: "als Teams-Nachricht",
  APP: "Glocke oben in der App",
};

/** Kanäle für Benachrichtigungen (AK-1011): beliebig kombinierbar, auch keiner – dann mit Hinweis. */
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
        <legend className="text-sm font-medium text-slate-800">Benachrichtigungen erhalten per</legend>
        {CHANNELS.map((channel) => (
          <label key={channel} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3">
            <input
              type="checkbox"
              name="channels"
              value={channel}
              checked={selected.includes(channel)}
              onChange={(event) => toggle(channel, event.target.checked)}
              className="h-5 w-5"
            />
            <span>
              <span className="font-medium text-slate-900">{CHANNEL_LABELS[channel]}</span>{" "}
              <span className="text-sm text-slate-500">({HINTS[channel]})</span>
            </span>
          </label>
        ))}
      </fieldset>
      {selected.length === 0 ? (
        <p role="alert" data-testid="no-channel-warning" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Kein Kanal gewählt.</strong> {NO_CHANNEL_WARNING}
        </p>
      ) : null}
      {state?.ok ? <Notice tone="success">{state.message}</Notice> : null}
      {state && !state.ok ? <Notice tone="error">{state.formError}</Notice> : null}
      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full sm:w-auto`}>
        Kanäle speichern
      </button>
    </form>
  );
}

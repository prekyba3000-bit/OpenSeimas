import React from 'react';
import { WifiOff, ServerCrash, RefreshCw } from 'lucide-react';
import { LT } from '../i18n/lt';
import { isDeviceOnline } from '../services/network';

/**
 * Should a query fall back to the connection screen?
 *
 * True when it has no usable data and either errored (server reachable but the
 * request failed) or is paused (React Query pauses fetches while the device is
 * offline). Either way there is nothing to show but the connection screen; the
 * screen itself names the specific cause. When cached data exists we keep
 * showing it rather than blanking the page.
 */
export function isConnectionProblem(query: {
  isError: boolean;
  isPaused: boolean;
  data: unknown;
}): boolean {
  const hasData = query.data !== undefined && query.data !== null;
  return !hasData && (query.isError || query.isPaused);
}

/**
 * Loading spinner that, if the wait runs long, explains why: the first request
 * of a session may be waiting on a sleeping Render service. The escalated copy
 * appears only after `connectingAfterMs` so a fast warm load never shows it.
 */
export function ConnectingNotice({
  connectingAfterMs = 3000,
}: {
  connectingAfterMs?: number;
}) {
  const [connecting, setConnecting] = React.useState(false);

  React.useEffect(() => {
    const t = window.setTimeout(() => setConnecting(true), connectingAfterMs);
    return () => window.clearTimeout(t);
  }, [connectingAfterMs]);

  return (
    <div
      role="status"
      className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center text-muted-foreground"
    >
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      {connecting ? (
        <div className="space-y-1">
          <p className="text-foreground">{LT.connection.connecting}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{LT.connection.connectingHint}</p>
        </div>
      ) : (
        <p>Kraunama…</p>
      )}
    </div>
  );
}

/**
 * Error screen for a failed load. Names the real cause — device offline vs. our
 * server unreachable — and offers a retry. Connectivity is checked on mount so
 * the copy matches the actual situation on a real device.
 */
export function ConnectionError({ onRetry }: { onRetry: () => void }) {
  // null until checked, so we don't flash the wrong cause first.
  const [online, setOnline] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let active = true;
    isDeviceOnline().then((v) => {
      if (active) setOnline(v);
    });
    return () => {
      active = false;
    };
  }, []);

  const offline = online === false;
  const Icon = offline ? WifiOff : ServerCrash;
  const title = offline ? LT.connection.offlineTitle : LT.connection.unreachableTitle;
  const body = offline ? LT.connection.offlineBody : LT.connection.unreachableBody;

  return (
    <div
      role="alert"
      className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <Icon className="w-10 h-10 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-lg font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground max-w-sm">{body}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
      >
        <RefreshCw className="w-4 h-4" />
        {LT.connection.retry}
      </button>
    </div>
  );
}

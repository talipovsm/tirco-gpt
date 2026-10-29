"use client";
import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import { hasLoadDraftChanges, localLoadDraftKey, parseLocalLoadDraft, type LoadDraftScope } from "./local-load-draft";
import type { WizardValues } from "./wizard-values";

const CHANGE_EVENT = "tirco:load-form-change";
const UNAVAILABLE = "storage-unavailable";

/** Recovery is local to this browser, account, active company and data mode. */
export function useLoadDraftRecovery({
  scope,
  form,
  step,
  idempotencyKey,
}: {
  scope?: LoadDraftScope;
  form: UseFormReturn<WizardValues>;
  step: number;
  idempotencyKey: string;
}) {
  const key = scope ? localLoadDraftKey(scope) : null;
  const subscribe = React.useCallback((changed: () => void) => {
    window.addEventListener("storage", changed);
    window.addEventListener(CHANGE_EVENT, changed);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener(CHANGE_EVENT, changed);
    };
  }, []);
  const read = React.useCallback(() => {
    if (!key) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return UNAVAILABLE;
    }
  }, [key]);
  const raw = React.useSyncExternalStore(subscribe, read, () => undefined);
  const draft = React.useMemo(() => parseLocalLoadDraft(raw ?? null), [raw]);
  const [resolved, setResolved] = React.useState(false);
  const [writeFailed, setWriteFailed] = React.useState(false);
  const completed = React.useRef(false);
  const pending = !resolved ? draft : null;
  const ready = raw !== undefined;
  const storageUnavailable = raw === UNAVAILABLE;

  const remove = React.useCallback(() => {
    if (!key) return;
    try {
      window.localStorage.removeItem(key);
      window.dispatchEvent(new Event(CHANGE_EVENT));
      setWriteFailed(false);
    } catch {
      setWriteFailed(true);
    }
  }, [key]);

  React.useEffect(() => {
    if (!key || !ready || pending || storageUnavailable || completed.current) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let changed = false;
    const save = () => {
      clearTimeout(timer);
      if (completed.current) return;
      const values = form.getValues();
      if (!hasLoadDraftChanges(values)) return;
      try {
        const next = JSON.stringify({ version: 1, updatedAt: Date.now(), step, idempotencyKey, values });
        // Do not report success when the browser cannot retain the recovery copy.
        if (!parseLocalLoadDraft(next)) throw new Error("Invalid recovery copy");
        setResolved(true);
        window.localStorage.setItem(key, next);
        setWriteFailed(false);
        window.dispatchEvent(new Event(CHANGE_EVENT));
        changed = false;
      } catch {
        setWriteFailed(true);
      }
    };
    const queue = () => {
      changed = true;
      clearTimeout(timer);
      timer = setTimeout(save, 500);
    };
    const subscription = form.watch(queue);
    // Persist progress between steps even when no field was edited on that step.
    if (hasLoadDraftChanges(form.getValues())) queue();
    const flush = () => {
      if (changed) save();
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
      flush();
    };
  }, [key, ready, pending, storageUnavailable, form, step, idempotencyKey]);

  return {
    pending,
    saved: resolved && draft !== null,
    unavailable: raw === UNAVAILABLE || writeFailed,
    restore: () => {
      setResolved(true);
      return pending;
    },
    discard: () => {
      remove();
      setResolved(true);
    },
    complete: () => {
      completed.current = true;
      remove();
    },
  };
}

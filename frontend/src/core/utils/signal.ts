/**
 * Combine multiple AbortSignals into one.
 * Cleans up already-attached listeners if an early-abort is detected mid-loop.
 */
export function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const handlers: Array<{ signal: AbortSignal; handler: () => void }> = [];

  const abort = (): void => {
    controller.abort();
    // Remove all listeners that were already attached to avoid leaks
    handlers.forEach(({ signal, handler }) =>
      signal.removeEventListener('abort', handler),
    );
  };

  for (const signal of signals) {
    if (signal.aborted) {
      abort();
      break;
    }
    const handler = (): void => abort();
    handlers.push({ signal, handler });
    signal.addEventListener('abort', handler, { once: true });
  }

  return controller.signal;
}

/**
 * Create an abort signal with a timeout.
 * Returns the combined signal and a cleanup function to cancel the timer.
 */
export function createTimeoutSignal(
  userSignal: AbortSignal | undefined,
  timeout: number,
): { signal: AbortSignal; cleanup: () => void } {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

  const signal = userSignal
    ? combineAbortSignals([userSignal, timeoutController.signal])
    : timeoutController.signal;

  const cleanup = (): void => clearTimeout(timeoutId);

  return { signal, cleanup };
}

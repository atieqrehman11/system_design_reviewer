/**
 * Combine multiple AbortSignals into one
 */
export function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

/**
 * Create abort signal with timeout
 */
export function createTimeoutSignal(
  userSignal: AbortSignal | undefined,
  timeout: number
): { signal: AbortSignal; cleanup: () => void } {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

  const signal = userSignal
    ? combineAbortSignals([userSignal, timeoutController.signal])
    : timeoutController.signal;

  const cleanup = () => clearTimeout(timeoutId);

  return { signal, cleanup };
}

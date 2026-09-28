/** Modern browsers supporting AbortSignal.any/timeout are required.
 * The native deadline stays attached while the SDK consumes the response body.
 * This wrapper never retries; SDK retries and auth lock waits remain SDK-controlled.
 */
export const starterFetch: typeof fetch = (input, init) => {
  const signals = [AbortSignal.timeout(15000)];
  if (input instanceof Request) signals.push(input.signal);
  if (init?.signal) signals.push(init.signal);
  return fetch(input, { ...init, redirect: "error", signal: AbortSignal.any(signals) });
};

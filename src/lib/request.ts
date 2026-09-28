/** Modern browsers supporting AbortSignal.any/timeout are required.
 * The native deadline stays attached while the SDK consumes the response body.
 * This wrapper never retries; SDK retries and auth lock waits remain SDK-controlled.
 */
export const starterFetch: typeof fetch = async (input, init) => {
  const signals = [AbortSignal.timeout(15000)];
  if (input instanceof Request) signals.push(input.signal);
  if (init?.signal) signals.push(init.signal);
  const response = await fetch(input, { ...init, redirect: "manual", signal: AbortSignal.any(signals) });
  if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
    void response.body?.cancel().catch(() => {});
    throw new TypeError("Redirected authentication request was blocked.");
  }
  return response;
};

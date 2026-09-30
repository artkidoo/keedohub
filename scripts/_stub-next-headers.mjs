// Stub of `next/headers` so server modules that import it load under
// `node --test`. These throw like the real API when called outside a request,
// which never happens in the domain tests (session is supplied to them).
export async function headers() {
  return new Headers();
}
export function cookies() {
  throw new Error("cookies() is unavailable under node --test");
}
export function connection() {}
export function draftMode() {
  return { isEnabled: false, enable() {}, disable() {} };
}
export function after(fn) {
  return fn;
}

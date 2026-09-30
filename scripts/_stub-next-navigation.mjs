// Stub of the parts of `next/navigation` the domain modules import at runtime,
// so the app's server code can be exercised under `node --test` (where Next's
// own module graph is not available). These mirror Next's throw-on-signal
// behaviour for notFound()/redirect(); revalidate is a no-op.
export function notFound() {
  throw Object.assign(new Error("NEXT_NOT_FOUND"), { digest: "NEXT_NOT_FOUND" });
}
export function redirect(url) {
  throw Object.assign(new Error("NEXT_REDIRECT: " + url), {
    digest: "NEXT_REDIRECT",
  });
}
export function permanentRedirect(url) {
  throw Object.assign(new Error("NEXT_REDIRECT: " + url), {
    digest: "NEXT_REDIRECT",
  });
}
export function forwardRefresh() {}
export const usePathname = () => "/";
export const useRouter = () => ({ push() {}, replace() {}, refresh() {} });
export const useSearchParams = () => new URLSearchParams();
export const useParams = () => ({});
export function ReadonlyURLSearchParams() {}

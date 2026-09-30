// Stub of `next/cache` so server modules that call revalidatePath/Tag load and
// run harmlessly under `node --test` (no Next router is present to invalidate).
export function revalidatePath() {}
export function revalidateTag() {}
export function refresh() {}
export function unstable_cache(fn) {
  return fn;
}
export function cache(fn) {
  return fn;
}

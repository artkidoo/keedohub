/**
 * Liveness probe (Phase 5.2B).
 *
 * Reports only that the process answers. No version strings, no dependency
 * states, no paths, no credentials — a load balancer needs "up", and
 * anything more is information for an attacker. A database check with a
 * timeout may be added later; today a saturated DB must not flip this to
 * red and flap the fleet.
 */
export async function GET(): Promise<Response> {
  return Response.json({ ok: true }, { status: 200 });
}

# KeedoHub — Launch Readiness Checklist

**Status: NOT LAUNCH-READY.** Phase 5 (Hardening + Launch) is in progress.

This checklist exists to keep the record honest. Every item is marked with the evidence behind it. **"Verified locally" means exactly that** — it does not mean verified in production.

Verification marks used below:

| Mark | Meaning |
| --- | --- |
| ✅ | Executed and observed, evidence recorded |
| ⚠️ | Implemented and unit-tested, but not exercised against real infrastructure or real traffic |
| ❌ | Not executed. No claim is made. |

Last reviewed: Phase 5.2E. Playwright browser suite newly executed: 31/31 passed on a live local dev server; see the "Browser checks" rows in §3.

---

## 1. Verified locally

These were actually executed against a local development server and a local PostgreSQL instance.

| Item | Mark | Evidence |
| --- | --- | --- |
| `npx tsc --noEmit` passes | ✅ | exit 0 |
| `npm run lint` passes | ✅ | exit 0, 0 errors |
| `npm run build` passes | ✅ | exit 0 |
| `git diff --check` clean | ✅ | exit 0 |
| `npm test` passes | ✅ | 24/24 assertions across 4 focused files |
| Anonymous users redirected from `/workspace*` | ✅ | live HTTP: `307 → /login?next=…` |
| Anonymous Studio routes fail closed | ✅ | live HTTP: `/studio` → `307 → /login`; `/studio/assets`, `/studio/approvals` → `404` (no existence disclosure) |
| Forged asset ids rejected | ✅ | live HTTP: `/api/assets/<forged-uuid>` → `401` |
| Forged workspace file ids rejected | ✅ | live HTTP: `/workspace/brand/work/<forged>/files/<forged>` → `307` |
| Real signup + database-backed session works | ✅ | live HTTP: `200` + valid session row returned |
| Security headers present | ✅ | live HTTP: `nosniff`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy` |
| HSTS correctly absent in development | ✅ | production-only by design |
| `/api/health` leaks nothing | ✅ | live HTTP: body is exactly `{"ok":true}` |
| Authentication throttling returns `429` | ✅ | live HTTP: `401×3` then `429×5` |
| S3 fail-fast on missing configuration | ✅ | `STORAGE_PROVIDER=s3` + empty `S3_BUCKET` threw `StorageError: … S3_BUCKET is required…`; **no fallback to local disk** |
| Refused upload leaves no orphan asset row | ✅ | integration test + live run |
| Delivery fails closed on forged ids | ✅ | integration test |
| Rate limiter blocks within window | ✅ | unit test |
| Fail-open limiter policy honoured | ✅ | unit test |
| Logger redacts secrets/URLs/paths | ✅ | unit test |
| Playwright browser suite executed | ✅ | `npx playwright test e2e/access.spec.ts e2e/workspace.spec.ts` → **31/31 passed** (≈7.1 min, 1 worker, chromium, live local dev server). Covers anonymous access redirects, anonymous refusal of the private Studio, login/logout and wrong-password rejection, customer isolation from operator surfaces, brand/artist context navigation, and responsive layout with no horizontal overflow at 390×844, 768×1024 and 1440×900. |


---

## 2. Requires real infrastructure or configuration

Nothing in this section has been done. No services are provisioned.

| Item | Mark | Notes |
| --- | --- | --- |
| Hosting target chosen and configured | ❌ | No `vercel.json`, `Dockerfile`, CI workflow or hosting config in the repository |
| Separate dev / preview / production environments | ❌ | Only a single local development environment has ever run |
| Managed PostgreSQL provisioned | ❌ | Local PostgreSQL only |
| **Automated database backups** | ❌ | Not configured anywhere |
| **Point-in-time recovery (PITR)** | ❌ | Not configured anywhere |
| **A tested restore from backup** | ❌ | Never performed — a backup that has never been restored is not a backup |
| Private S3-compatible bucket provisioned | ❌ | No bucket exists |
| **Real-service S3 integration test** | ❌ | Storage verified only with mocks; no live read/write against any bucket |
| Production environment variables set | ❌ | None configured |
| Monitoring provisioned | ❌ | No vendor |
| Alerting configured | ❌ | No vendor, no alert rules |
| Error tracking vendor integrated | ❌ | Deliberately not added: no unconfigured third-party service is claimed as operational |
| Log aggregation / retention policy | ❌ | Logs go to stdout only |
| Deployment runbook written | ❌ | Does not exist |

---

## 3. Requires additional security or end-to-end verification

Implemented and unit-tested where noted, but not proven against real traffic or a real browser.

| Item | Mark | Notes |
| --- | --- | --- |
| **Distributed rate limiting** | ⚠️ | **Not implemented.** `MemoryRateLimitStore` is single-instance/in-memory. `RATE_LIMIT_REDIS_URL` is a documented seam only; setting it changes nothing. Effective limit multiplies by instance count on multi-instance hosting. |
| **Two-customer isolation over real traffic** | ✅ | **Now exercised over real traffic** (Phase 5.3B): `e2e/isolation.spec.ts` provisions two live tenants through the real `/signup` route and drives real logged-in sessions against each other's assets, files, projects, requests and review decisions. Cross-customer file bytes and asset API calls are refused, a foreign review decision changes nothing, cross-customer `DELETE` is refused while the file survives, and both tenants still see only their own data. |
| **Full operator authorization matrix** | ⚠️ | `requireOperator()` re-verifies on every Studio page and action and fails closed; unit-tested. The isolation suite now proves that a customer's submitted ids cannot substitute for operator access and that operator revocation sticks (`401` → Studio `200` on grant → Studio `404` after revoke, via `npm run studio:operator`). The anon / customer / foreign-operator sweep across *every* Studio route is still not complete. |
| **Full request-to-delivery customer journey** | ⚠️ | Lifecycle logic unit-tested. Never executed as one continuous flow in a browser. |
| **Browser checks at 390×844** | ✅ | Playwright installed and executed (`npx playwright test e2e/access.spec.ts e2e/workspace.spec.ts`); 31/31 passed; no horizontal overflow at 390×844 in the responsive-layout check. |
| **Browser checks at 768×1024** | ✅ | Same run; no horizontal overflow at 768×1024. |
| **Browser checks at 1440×900** | ✅ | Same run; no horizontal overflow at 1440×900. |
| **Keyboard-only navigation** | ❌ | Not executed. |
| **Accessibility checks** | ❌ | No axe or equivalent scan has ever run. |
| Production HTTPS / TLS verification | ❌ | Never served over TLS |
| Production cookie security flags | ⚠️ | `httpOnly` + `secure` via Better Auth's Next cookie plugin; never observed on a real HTTPS response |
| Production origin validation | ⚠️ | `AUTH_TRUSTED_ORIGINS` must be `https:` in production and fails startup loudly; **not yet tested against a real production origin** |
| **Global Content Security Policy** | ⚠️ | Intentionally omitted. The Studio preview route pins its own `default-src 'none'; sandbox`. A global CSP is unresolved and must not be added without testing auth, previews and every page. |
| Session lifetime review | ⚠️ | 30 days, deliberately retained and documented; not yet validated against a real security review |
| Operator bootstrap / revocation runbook | ❌ | CLI works (`npm run studio:operator`) but no documented production procedure for who runs it, from where, or how rotation happens |
| Upload content sniffing / antivirus | ❌ | Validation is extension- and shape-based only |
| Dependency vulnerability audit | ❌ | Not run in this phase |
| Database migration rollback plan | ❌ | Forward-only migrations; no tested rollback |
| Load / performance testing | ❌ | Not performed |
| Browser compatibility matrix | ❌ | No browser testing at all |

---

## 4. Required before public launch

Minimum set. Nothing here is optional, and **nothing here is currently done**.

1. Choose a hosting target and configure separate development / preview / production environments.
2. Provision managed PostgreSQL; enable automated backups and point-in-time recovery; **perform and record one successful test restore**.
3. Provision a private S3-compatible bucket; run a real integration test (upload, download, delete) end to end.
4. Decide on deployment topology, then either stay single-instance or implement distributed rate limiting behind the existing `RateLimitStore` seam. Document the decision explicitly.
5. Integrate monitoring, alerting and error tracking.
6. Verify production HTTPS, `AUTH_TRUSTED_ORIGINS`, cookie flags and all security headers against a real production response.
7. Run **two-customer isolation tests** with two real live sessions and each other's real resource identifiers.
8. Run the **complete operator authorization matrix** against every Studio route (anonymous, customer, foreign operator).
9. Execute the **complete request-to-delivery journey** in a browser as one flow.
10. Install Playwright and run browser checks at **390×844, 768×1024 and 1440×900**, plus keyboard-only navigation and an accessibility scan. Fix findings.
11. Decide on and, if adopted, implement a global Content Security Policy — tested against auth, Studio previews and every page.
12. Write the **deployment runbook** and the **recovery runbook** (including operator provisioning and credential rotation).
13. Run a dependency vulnerability audit and address critical findings.
14. Write and rehearse a migration/rollback plan.

Until every item above is verified, KeedoHub must not be described as launch-ready, and no real customer data should be stored in any environment.

| Recovery runbook written | ❌ | Does not exist |

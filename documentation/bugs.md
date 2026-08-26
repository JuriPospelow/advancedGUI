# Bug Tracking only in a App GUI

| Step found | Error description | Test result after fix | Root cause |
|---|---|---|---|
| Phase 1 — p5 baseline | `npx tsc --noEmit` fails: `src/main/broker.ts(19,24): error TS2351: This expression is not constructable. Type 'typeof import("aedes")' has no construct signatures.` | Not fixed — pre-existing, unrelated to planned changes | aedes@0.51.3 type definitions lack a constructor signature; `new aedes()` works at runtime. Tests pass. |
| p9 Step C baseline | `npx tsc --noEmit` fails with 8 errors: broker.ts, pino-logger.ts, express-server.ts (+tests); 0 errors in index.ts before and after the health-refs refactor | Not fixed — pre-existing, unrelated to planned changes; used only as before/after diff (unchanged) | Same root as Phase 1 entry plus further untyped overload mismatches (pino, HealthData shape); project runs via tsx without a typecheck step. |
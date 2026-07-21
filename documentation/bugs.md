# Bug Tracking

| Step found | Error description | Test result after fix | Root cause |
|---|---|---|---|
| Phase 1 — p5 baseline | `npx tsc --noEmit` fails: `src/main/broker.ts(19,24): error TS2351: This expression is not constructable. Type 'typeof import("aedes")' has no construct signatures.` | Not fixed — pre-existing, unrelated to planned changes | aedes@0.51.3 type definitions lack a constructor signature; `new aedes()` works at runtime. Tests pass. |
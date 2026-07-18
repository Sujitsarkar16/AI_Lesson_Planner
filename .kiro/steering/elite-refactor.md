---
title: Production Code Quality and Refactoring Rules
inclusion: always
---

# Senior production-engineer mode

Treat this as a production SaaS codebase, not a prototype. Prioritize correctness, clarity, reliability, and maintainability over generating more code.

Before editing:
1. Read the relevant feature flow end-to-end: frontend → API → service → database/worker → response.
2. Search the repository for existing helpers, patterns, callers, types, tests, and database interactions.
3. Identify the root cause. Never patch only the visible symptom.
4. Propose the smallest safe change. Reuse or delete before adding.

## Non-negotiable rules

- Do not create new files, abstractions, utility layers, wrappers, classes, hooks, or dependencies unless they remove proven duplication across at least two real production call sites.
- Do not duplicate logic. Extract a shared function only when it has a clear, stable responsibility and at least two callers.
- Do not create generic “manager”, “helper”, “base”, “factory”, “adapter”, or repository layers with one implementation.
- Prefer direct, typed, readable code over clever abstractions.
- Prefer existing project patterns before introducing a new pattern.
- Remove dead code, unused imports, unused state, commented-out code, obsolete flags, duplicate components, duplicate API calls, and unreachable branches.
- Keep functions focused. Split only when it improves a real boundary, testability, or reuse—not merely to reduce line count.
- Preserve API contracts, database schema compatibility, authentication, authorization, tenant isolation, validation, retries, idempotency, error handling, logging, and accessibility.
- Never simplify away security checks, null handling, validation, queue retry logic, transaction boundaries, or error recovery.
- Do not silently change database columns, Supabase queries, migrations, or API response shapes.
- For non-trivial changes, run or add the smallest relevant test, type check, lint check, or build verification.
- Make changes in small coherent batches. Do not perform broad rewrites.

## PaperGrader-specific safeguards

This application has React/JSX frontend, Python/FastAPI backend, Supabase, OCR processing, background workers, and heavy grading jobs.

- Preserve non-blocking background processing and job-status flows.
- Do not replace worker/queue logic with synchronous API processing.
- Maintain idempotency and safe retry behavior for OCR, mapping, evaluation, and grading jobs.
- Check every Supabase read/write against actual schema, nullability, RLS, tenant/institution scope, indexes, and response assumptions.
- Identify repeated frontend API clients, duplicated backend validation, duplicate status handling, repeated database queries, and repeated OCR pipeline logic.
- Prefer one canonical implementation for each business rule.

## Required response format before changes

For every refactoring task, report:

1. Files and feature flow inspected
2. Duplications, dead code, or unnecessary abstractions found
3. Exact proposed reduction
4. Risks and tests to run
5. Files that will change

Then wait for approval before a broad refactor. For a small isolated fix, proceed and report the verification performed.
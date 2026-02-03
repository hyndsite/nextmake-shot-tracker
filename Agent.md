# Codex Agent Contract — Vitest Test Authoring + Running

You operate in two explicit modes:
- TEST_WRITER: create/extend Vitest tests and ensure they pass.
- TEST_RUNNER: run Vitest tests, diagnose failures, and report results (no edits by default).

This file is authoritative. Follow it exactly.

---

## Global Operating Principles (Always)

### Primary Objectives
1. Preserve existing repository conventions (test locations, naming, patterns, helpers, and setup).
2. Produce correct, deterministic, fast-running Vitest tests.
3. Keep diffs minimal and scoped.
4. Provide clear, structured reporting after each run.

### Hard Constraints
- Do not invent new test patterns or relocate tests.
- Do not refactor production code unless explicitly requested.
- Do not add new dependencies unless explicitly requested.
- Never add skipped/todo tests (`it.skip`, `describe.skip`, `test.skip`, `test.todo`) unless explicitly requested.

### Test Convention Preservation (Non-Negotiable)
Before writing or running tests, you MUST discover and follow the repo’s current conventions:
- Where tests live (e.g., `src/**`, `__tests__`, `tests/`, co-located, etc.)
- Naming patterns (`*.test.ts`, `*.spec.ts`, etc.)
- Existing test utilities, setup files, and environment patterns
- Mocking strategy and shared fixtures
- Any custom Vitest config and aliases

If any convention conflicts with your assumptions, always follow the repo, not your assumptions.

---

## Mode Selection

You will be explicitly invoked in one of these modes via the user prompt prefix:
- "TEST_WRITER: ..."
- "TEST_RUNNER: ..."

If the user does not specify a mode:
- Default to TEST_WRITER when asked to create/modify tests.
- Default to TEST_RUNNER when asked to run tests / diagnose failures.

---

## Shared Discovery Checklist (Do this first in BOTH modes)

1. Identify package manager and scripts:
   - Inspect `package.json` scripts for `test`, `test:unit`, `vitest`, `coverage`, etc.
2. Locate Vitest configuration:
   - `vitest.config.*`, `vite.config.*`, workspace config, test setup files.
3. Locate existing tests and patterns:
   - Identify directories + filename patterns in use.
   - Inspect a few representative tests that match the target area.
4. Locate test environment and setup:
   - `setupTests.*`, global mocks, test env (`jsdom` vs `node`), polyfills.
5. Identify helper utilities:
   - e.g., `test-utils`, shared fixtures, factories, MSW handlers, etc.

---

## TEST_WRITER Mode

### Mission
Write Vitest tests that match repo conventions and run green.

### Workflow
1. Discovery (required)
   - Perform Shared Discovery Checklist.
   - Inspect the target source files and relevant existing tests.
2. Test design
   - Prefer behavior-focused tests over implementation-detail tests.
   - Cover:
     - happy path(s)
     - meaningful edge cases
     - error handling / invalid inputs
     - regressions implied by reported bugs (if any)
3. Implementation
   - Place tests exactly where the repo expects them.
   - Use the repo’s existing test utilities and setup patterns.
   - Keep tests deterministic:
     - Avoid real network and time dependence.
     - Use fake timers only if the repo commonly does so.
     - Mock randomness/time consistently.
4. Run tests
   - Run the smallest-scoped command that validates your change:
     - a single file test run (preferred), or grep, or related
     - full suite only if required
5. Fix
   - Fix test issues you introduced.
   - If production code must change for testability, stop and ask (unless user explicitly requested prod changes).

### Quality Standards
- No skipped/todo tests unless explicitly requested.
- Tests should be stable and fast.
- Keep mocking minimal and realistic.
- Use clear test names and organize logically.

### Output Protocol (Always after work)
Provide:
- Files changed (list paths)
- New/updated tests summary:
  - number of test cases added/modified
  - what behaviors are covered
- Command(s) run
- Result:
  - pass/fail
  - any notable warnings
- Coverage summary only if coverage was run (do not invent coverage numbers)

---

## TEST_RUNNER Mode

### Mission
Run Vitest tests as requested, capture output, diagnose failures, and recommend next steps.

### Default Constraint (Runner Safety)
- Do NOT modify files by default.
- If a fix is needed:
  - Explain the likely cause
  - Propose specific changes
  - Ask for permission to apply changes (unless user explicitly asked you to fix)

### Workflow
1. Discovery (required)
   - Perform Shared Discovery Checklist.
2. Choose the correct run strategy
   - Prefer smallest scope:
     - single test file
     - `--grep "<pattern>"`
     - related tests if the repo supports it
   - Use coverage only if requested.
3. Execute
   - Run the command(s).
   - Capture stdout/stderr and exit code.
4. Diagnose
   - Summarize failures by:
     - failing test name(s)
     - file(s)
     - stack traces / assertion diffs
     - likely root cause
   - Identify whether it’s:
     - flaky / timing
     - environment mismatch (jsdom/node)
     - mock leakage
     - dependency/version mismatch
     - genuine logic bug
5. Recommend
   - Provide actionable steps:
     - changes to tests
     - changes to setup/mocks
     - changes to production code (only if necessary)

### Suggested Command Cookbook (Adapt to repo scripts)
Choose the repo-preferred script first (e.g., `pnpm test`, `npm run test`), otherwise direct Vitest usage:
- `vitest`
- `vitest run`
- `vitest run path/to/file.test.ts`
- `vitest run --grep "pattern"`
- `vitest run --coverage` (only if requested)
- `vitest --ui` (only if requested)
- Retry strategies only when diagnosing flakes (and only if repo policy allows)

### Output Protocol (Always after runs)
Provide:
- Command(s) run
- Summary:
  - passed/failed counts (from output)
  - failing tests (names + files)
- Key failure excerpts (short)
- Root-cause hypothesis (ranked if multiple)
- Recommended next action
- Note whether you modified any files (should be “No” unless permitted)

---

## Interaction Rules

- If requirements are ambiguous (e.g., what to test, expected behavior), ask targeted questions.
- If you discover repo conventions that conflict with instructions, repo conventions win.
- Keep changes minimal; avoid refactors.
- Always be explicit about what was run and what changed.

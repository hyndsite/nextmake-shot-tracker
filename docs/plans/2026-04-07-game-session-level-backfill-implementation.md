# Game Session Level Backfill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Backfill existing `game_sessions` rows into the new structured level model using the approved legacy rules for `AAU / Travel` and `Middle School`.

**Architecture:** Add one targeted sequel SQL migration that updates only known legacy labels and date windows. The migration will populate the structured fields and refresh the human-readable `level` column so downstream screens continue to render correctly without parsing legacy values.

**Tech Stack:** PostgreSQL, Supabase SQL migrations

---

### Task 1: Add targeted backfill migration for legacy game session levels

**Files:**
- Create: `docs/SQL/supabase-game-session-level-backfill.sql`

**Step 1: Write the migration**

Create a migration that:
- updates legacy `AAU / Travel` rows dated `2025-12-01` through `2026-02-28`
- updates legacy `AAU / Travel` rows dated `2026-03-01` and later
- updates legacy `Middle School` rows
- writes both structured fields and the refreshed `level` label

**Step 2: Review the SQL logic**

Review for:
- exact date windows
- exact stored values (`Winter`, `Spring`, `7th Grade`)
- no unintended updates outside the approved legacy labels
- nulling unrelated structured fields per category

**Step 3: Save the final SQL**

Keep the migration idempotent enough for one-time execution against the same known legacy rows by matching the old labels directly.

**Step 4: Commit**

```bash
git add docs/SQL/supabase-game-session-level-backfill.sql
git commit -m "feat: backfill legacy game session levels"
```

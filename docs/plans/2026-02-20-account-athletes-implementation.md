# Account Athletes Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an Account `Athletes` tab with clean expandable athlete cards and editable first/last name plus avatar card color.

**Architecture:** Keep Account as a tabbed single screen (`Profile`/`Athletes`), reuse `athlete-db` helpers for CRUD-like operations, and maintain local editable draft state per expanded athlete for low-clutter editing. Validate and persist updates through `updateAthlete` and reflect active athlete metadata in list display.

**Tech Stack:** React, Vitest, Testing Library, localStorage-backed athlete-db

---

### Task 1: Add failing Account tests for Athletes tab

**Files:**
- Modify: `src/screens/__tests__/Account.test.jsx`

**Step 1: Write failing tests**
- Verify segmented control shows `Profile` and `Athletes` and tab switch works.
- Verify athlete list renders in Athletes tab.
- Verify editing first/last/color persists via `updateAthlete`.
- Verify add athlete uses `createAthlete`.

**Step 2: Run tests to confirm RED**
- `npm test -- src/screens/__tests__/Account.test.jsx`

### Task 2: Implement Athletes tab in Account

**Files:**
- Modify: `src/screens/Account.jsx`

**Step 1: Add state + imports**
- Import athlete helpers and define tab + athlete state.

**Step 2: Add segmented control and tab panels**
- Keep existing sync/sign-out in Profile tab.
- Add Athletes tab with list and controls.

**Step 3: Add editable athlete card details**
- Expand/collapse one athlete at a time.
- Inputs for first/last/color + Save/Cancel.
- Add athlete action and archive action.

**Step 4: Re-run Account tests**
- `npm test -- src/screens/__tests__/Account.test.jsx`

### Task 3: Focused verification

**Files:**
- None

**Step 1: Run target tests**
- `npm test -- src/screens/__tests__/Account.test.jsx`

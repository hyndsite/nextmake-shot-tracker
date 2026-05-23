# Worktree Env Link Script Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reusable repo script and npm command that link a worktree's `.env.local` to the shared `~/.config/nextmake-shot-tracker/.env.local` file.

**Architecture:** Keep the symlink logic in a single shell script so the behavior is consistent across direct shell use and npm use. Expose an npm alias as a thin wrapper, and document the new command in the worktree setup note.

**Tech Stack:** POSIX shell, npm scripts, markdown docs

---

### Task 1: Add the link script

**Files:**
- Create: `scripts/link-worktree-env.sh`

**Step 1: Write the script**
- Accept one argument: the target worktree path.
- Validate that the shared env file exists.
- Validate that the target directory exists.
- Remove any existing target `.env.local`.
- Create a symlink from the target `.env.local` to `~/.config/nextmake-shot-tracker/.env.local`.

**Step 2: Verify the script manually**

Run: `scripts/link-worktree-env.sh /tmp/some-worktree`

Expected: target `.env.local` becomes a symlink to the shared env file.

### Task 2: Add the npm wrapper and docs

**Files:**
- Modify: `package.json`
- Modify: `docs/setup-worktrees.md`

**Step 1: Add npm wrapper**
- Add `worktree:env` that runs `./scripts/link-worktree-env.sh`.

**Step 2: Update docs**
- Document both direct script usage and `npm run worktree:env -- <worktree-path>`.

### Task 3: Verify end to end

**Files:**
- Verify only

**Step 1: Run script against a temp directory**

Run: `mkdir -p /tmp/worktree-env-check && npm run worktree:env -- /tmp/worktree-env-check`

Expected: `/tmp/worktree-env-check/.env.local` is a symlink to `~/.config/nextmake-shot-tracker/.env.local`.

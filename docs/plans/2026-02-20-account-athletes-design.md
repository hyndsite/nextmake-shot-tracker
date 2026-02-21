# Account Athletes Tab Design

## Goal
Add an `Athletes` section to the Account screen that stays visually clean while allowing richer per-athlete details editing, including first name, last name, and avatar card color.

## UX Structure
- Account remains one screen with a segmented control:
  - `Profile` tab: current sync/sign-out content.
  - `Athletes` tab: athlete list and management.
- Athlete list uses compact cards with quick identity info and expandable details.
- Only one athlete editor can be open at a time to reduce clutter.

## Athletes Tab Content
- Top row:
  - `+ Add Athlete` button.
- Card summary:
  - initials avatar with `avatar_color`, full name, active/archived status.
- Expanded editor:
  - First name (required)
  - Last name (optional)
  - Color selector (preset swatches + hex preview)
  - Live preview for active-athlete card color
  - Save / Cancel
  - Archive action for non-active athlete only

## Data & State
- Source from `athlete-db` local storage helpers:
  - `listAthletes`, `createAthlete`, `updateAthlete`, `archiveAthlete`, `getActiveAthleteId`.
- Account screen local state:
  - `tab`, `athletes`, `activeAthleteId`, `expandedAthleteId`, and edit draft fields.
- Validation:
  - first name required
  - color must be valid hex

## Error Handling
- Invalid input shows inline message.
- Save/archive errors show alert fallback.

## Testing
- `Account.test.jsx` updated to cover:
  - tab switching
  - athletes list render
  - add athlete
  - edit first/last/color and save
  - archive behavior and active athlete archive guard

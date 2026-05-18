# Code Editor UI Plan

This document defines the UI direction for adding a code editor to interview sessions.

It should be read alongside:

```text
CODE_EDITOR_INTEGRATION.md
```

The integration plan covers architecture and persistence. This document focuses on how the editor should look, behave, and fit into the interview experience.

## UI Goal

The code editor should feel like a focused live-coding workspace inside the interview session.

It should help candidates:

- read the current question
- write code comfortably
- switch language when needed
- preserve drafts
- understand saved/sync state
- keep written explanation and code connected

It should not feel like a decorative add-on or a full IDE.

## When to Show the Editor

Show the code editor for:

- `technical`
- `system-design`
- `mixed`

Hide it for:

- `behavioral`

The app should still allow written answers for all interview types. Code supports the answer; it does not replace explanation.

## Current Component

The app already has:

```text
apps/web/src/components/code-editor-panel.tsx
```

Current features:

- Monaco editor
- language selector
- starter code button
- reset button
- line count
- local draft label

This is a good base. The UI work should refine how it sits inside the session and how it communicates state.

## Session Layout

Recommended desktop layout after code editor integration:

```text
Session header
Progress + question navigation

Two-column workspace:
  Left column
    Current question
    Rubric/context later
    Written answer

  Right column
    Code editor
    Editor status/footer

Bottom action bar
  Previous
  Save
  Next / Finish
```

Recommended mobile layout:

```text
Session header
Question navigation
Current question
Written answer
Code editor
Action buttons
```

On mobile, avoid side-by-side layouts.

## Editor Panel Structure

The editor panel should have:

```text
Panel header
  Label: Live coding
  Title: Code editor
  Language selector
  Starter
  Reset

Editor body
  Monaco editor

Footer
  Line count
  Draft/saved/sync status
```

Future collaborative version:

```text
Footer
  Line count
  Saved status
  Connected participants
  Sync status
```

## Header Controls

Keep controls compact and predictable.

Primary controls:

- language selector
- starter code
- reset

Later controls:

- copy code
- format code
- run code, only if execution is added

Do not add run/test controls until the product actually supports execution.

## Language Selector

Initial supported languages:

- TypeScript
- JavaScript
- Python
- SQL

Use the existing select for now. A segmented control may look nicer later, but select is simpler and scales better if more languages are added.

Language change behavior:

- changing language should not erase code automatically
- starter code should use the currently selected language
- if a draft exists for the selected question, restore its saved language

## Starter Code

The starter button should:

- insert starter code for the selected language
- ask for confirmation if the editor already has non-empty code

Suggested confirmation copy:

```text
Replace current code with starter code?
```

For the first implementation, a browser `confirm()` is acceptable. Later, use a small modal if the app introduces a modal pattern.

## Reset Code

The reset button should:

- clear the editor
- ask for confirmation if code exists

Suggested confirmation copy:

```text
Clear this code draft?
```

Reset should not clear the written answer.

## Draft and Saved States

The footer should clearly show the editor state.

Suggested statuses:

```text
Local draft
Unsaved changes
Saved
Saving...
Save failed
Syncing...
Synced
Disconnected
```

Phase 1 can keep:

```text
Local draft
Unsaved changes
```

Phase 2, with browser draft recovery:

```text
Draft saved locally
Unsaved changes
```

Phase 3, with API persistence:

```text
Saving...
Saved
Save failed
```

Phase 5, with WebSocket collaboration:

```text
Synced
Syncing...
Disconnected
```

## Question Navigation Behavior

Each question should have its own code draft.

When moving between questions:

- written answer should switch to that question
- code draft should switch to that question
- language should restore from that question draft
- unsaved state should be visible before navigation if persistence is added

Do not use one shared editor state across all questions.

## Relationship Between Answer and Code

Written answer and code should be visually connected but distinct.

Recommended order:

```text
Question
Written answer
Code editor
```

For technical interviews, candidates often need both:

- code for implementation
- written answer for reasoning, tradeoffs, and explanation

The UI should not imply that code alone completes the answer unless product rules later change.

## Empty State

When the editor is empty:

- Monaco itself can stay blank
- footer should still show line count and draft status
- starter button should be visible

Optional helper text outside Monaco:

```text
Use the editor for code, examples, or pseudocode.
```

Avoid too much instructional text inside the panel.

## Error States

Handle editor-specific errors:

- Monaco failed to load
- browser does not support required APIs
- draft could not be restored
- draft could not be saved
- collaborative connection lost

For Monaco loading failure, show a fallback panel:

```text
Code editor unavailable
Refresh the page and try again.
```

Later, fallback could be a plain `<textarea>`.

## Responsive Behavior

Desktop:

- editor can be 420-560px tall
- session workspace can become two columns
- question/answer column should remain readable

Mobile:

- editor should stack below written answer
- editor height can be 320-380px
- toolbar controls should wrap cleanly
- avoid horizontal scrolling

The Monaco editor must not overflow the viewport.

## Accessibility

Required:

- language selector has a visible or screen-reader label
- buttons use real `<button>` elements
- loading state is readable
- error state uses `role="alert"` when appropriate
- focus ring remains visible
- controls are keyboard reachable

Avoid:

- icon-only buttons until tooltips/labels exist
- color-only saved/error status
- clickable divs

## Visual Style

Use the existing app style:

- white panel surface
- stone borders
- teal accent for labels/focus
- dark Monaco editor theme
- compact controls

The editor should feel like a work tool, not a decorative card.

Recommended panel:

```text
rounded-lg
border border-stone-200
bg-white
shadow-sm
```

Recommended editor frame:

```text
rounded-lg
border border-stone-300
bg-stone-950
overflow-hidden
```

## First Implementation Scope

Start small:

1. Add `CodeEditorPanel` to `InterviewSession`.
2. Show it only for technical, system-design, and mixed interviews.
3. Keep editor state per question in React.
4. Preserve written-answer behavior.
5. Show code line count and local draft status.
6. Keep save/next behavior focused on written answers for now.

Do not persist code in the first UI pass unless the integration work is also being done.

## Suggested Component Changes

Update:

```text
apps/web/src/components/interview-session.tsx
```

Add helper:

```text
apps/web/src/features/interviews/code-editor.ts
```

Possible helper:

```ts
import type { CreateInterviewResponse } from '@ai-interview/shared';

export function shouldShowCodeEditor(interview: CreateInterviewResponse): boolean {
  return ['technical', 'system-design', 'mixed'].includes(interview.input.type);
}
```

Possible state shape:

```ts
type CodeDraft = {
  code: string;
  language: 'typescript' | 'javascript' | 'python' | 'sql';
};

type CodeDrafts = Record<string, CodeDraft>;
```

Question ID should be the key.

## Verification Checklist

Before finishing the first UI pass:

- behavioral interview does not show editor
- technical interview shows editor
- mixed interview shows editor
- system-design interview shows editor
- language selector works
- starter code works
- reset works
- code draft does not leak between questions
- previous/next question keeps the right draft
- mobile layout does not overflow
- `pnpm --filter web typecheck` passes
- `pnpm --filter web build` passes for larger UI changes

## Later Enhancements

After the first UI pass:

- local storage draft recovery
- API-backed code draft persistence
- saved/saving/error footer state
- code shown in report page
- collaborative sync status
- participant presence
- copy code button
- format code button
- read-only mode for reviewers

## Recommendation

Start with the local, per-question editor UI.

That gives the interview session a real coding surface quickly while keeping persistence, collaboration, and code evaluation as separate follow-up tasks.

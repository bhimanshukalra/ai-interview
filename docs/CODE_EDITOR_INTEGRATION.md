# Code Editor Integration Plan

This document outlines how to integrate a coding editor into the AI interview app.

The repo already has a basic Monaco-based editor component:

```text
apps/web/src/components/code-editor-panel.tsx
```

The goal is to introduce code editing in stages so the product gets value quickly without jumping straight into complex real-time collaboration.

## Goals

- Add a code editor to technical and mixed interview sessions.
- Let candidates write code while answering interview questions.
- Preserve code drafts during the interview.
- Eventually sync code between participants for live coding interviews.
- Keep editor concerns separate from interview answer/evaluation logic.

## Non-Goals for the First Integration

Do not start with:

- code execution
- collaborative editing
- CRDTs
- reviewer/admin playback
- multi-file projects
- terminal emulation
- AI code grading

Those can come later. The first version should be a useful single-file editor inside the interview room.

## Recommended Phases

### Phase 1: Local Editor in Interview Session

Add the existing `CodeEditorPanel` to the interview session UI.

Scope:

- Show editor only for `technical`, `system-design`, and `mixed` interviews.
- Keep editor state local in React.
- Do not persist code yet.
- Do not send editor content to the API yet.
- Let users choose language.
- Let users use starter code and reset.

Suggested placement:

```text
Interview question
Answer textarea
Code editor
Navigation / save buttons
```

For mobile, the editor should stack below the written answer.

Primary file:

```text
apps/web/src/components/interview-session.tsx
```

Potential helper:

```text
apps/web/src/features/interviews/code-editor.ts
```

Example helper:

```ts
import type { CreateInterviewResponse } from '@ai-interview/shared';

export function shouldShowCodeEditor(interview: CreateInterviewResponse): boolean {
  return ['technical', 'system-design', 'mixed'].includes(interview.input.type);
}
```

## Phase 2: Local Draft Recovery

Persist editor drafts in browser storage so refreshes do not lose work.

Use a key scoped by interview and question:

```text
ai-interview.codeDraft.{interviewId}.{questionId}
```

Store:

```ts
type CodeDraft = {
  code: string;
  language: 'typescript' | 'javascript' | 'python' | 'sql';
  updatedAt: string;
};
```

Suggested hook:

```text
apps/web/src/features/interviews/use-code-draft.ts
```

Responsibilities:

- load draft by interview/question ID
- save draft on editor changes
- clear draft if needed
- avoid local storage access during server render

This phase improves UX without changing the API or database.

## Phase 3: API Persistence

Persist code drafts or final code submissions server-side.

This is useful once code becomes part of interview history or reports.

Possible schema:

```text
interview_code_submissions
  id
  interview_id
  question_id
  language
  code
  created_at
  updated_at
```

Suggested API routes:

```text
GET  /interviews/:id/questions/:questionId/code
PUT  /interviews/:id/questions/:questionId/code
```

Shared schemas:

```ts
export const CodeEditorLanguageSchema = z.enum([
  'typescript',
  'javascript',
  'python',
  'sql'
]);

export const SaveCodeDraftSchema = z.object({
  questionId: z.string().min(1),
  language: CodeEditorLanguageSchema,
  code: z.string().max(20000)
});

export const CodeDraftResponseSchema = z.object({
  interviewId: z.string(),
  questionId: z.string(),
  language: CodeEditorLanguageSchema,
  code: z.string(),
  updatedAt: z.string()
});
```

Keep these schemas in:

```text
packages/shared/src/schemas/interviews.ts
```

or split later if interview schemas become too large:

```text
packages/shared/src/schemas/code-editor.ts
```

## Phase 4: Include Code in Report Context

Once code is persisted, decide whether evaluations should see code.

Options:

1. Written answer only.
2. Code only.
3. Written answer plus code.

Recommended first version:

- Preserve existing written-answer evaluation.
- Add code to report display as supporting context.
- Do not pass code to AI evaluation until prompts and scoring criteria are updated.

Later, update evaluation prompts to assess:

- correctness
- edge cases
- readability
- complexity
- tradeoffs
- testability
- communication through code comments

## Phase 5: WebSocket Sync

Only add real-time sync after the local and persisted editor are stable.

Start with basic last-write-wins sync before CRDTs.

Minimum sync behavior:

- both users join the same interview room
- server sends current document state to new joiner
- editor changes broadcast to the other participant
- language changes broadcast to the other participant
- presence shows who is connected

Suggested message types:

```ts
type CodeEditorMessage =
  | {
      type: 'join-code-room';
      interviewId: string;
      questionId: string;
    }
  | {
      type: 'code-state';
      questionId: string;
      language: string;
      code: string;
      updatedAt: string;
    }
  | {
      type: 'code-change';
      questionId: string;
      language: string;
      code: string;
      clientId: string;
      updatedAt: string;
    }
  | {
      type: 'peer-joined';
      clientId: string;
    }
  | {
      type: 'peer-left';
      clientId: string;
    };
```

Client files:

```text
apps/web/src/features/code-editor/
  code-editor-signaling-client.ts
  use-collaborative-code-editor.ts
```

Server files depend on the chosen backend:

```text
apps/api/src/routes/code-editor-socket.ts
apps/api/src/services/code-editor-rooms.ts
```

## Phase 6: Collaborative Editing Hardening

Last-write-wins is enough for a first collaborative demo, but not ideal when both users type at once.

If true collaborative editing becomes important, consider:

- Yjs
- Monaco binding for Yjs
- awareness/presence support
- server-side document persistence

Do not start here. CRDTs add complexity that is not needed for the first product version.

## UI Requirements

The editor should show:

- language selector
- starter code action
- reset action
- line count
- draft/saved status
- optional connected peer count later

For future collaboration:

- show connection state
- show remote participant presence
- show read/write state
- avoid hiding connection errors

## Data Ownership

Code should belong to:

- an interview
- a question
- the signed-in user or room participant

The API must verify:

- the interview exists
- the current user owns or can access the interview
- the question belongs to the interview

Do not accept only `questionId` without also validating the interview relationship.

## Error States

Handle:

- Monaco failed to load
- browser storage unavailable
- draft save failed
- code draft too large
- user is offline
- WebSocket disconnected
- collaborator left the room

## Suggested Implementation Order

1. Add `CodeEditorPanel` to technical/mixed interview sessions.
2. Add local code draft storage by interview/question.
3. Add draft status text to the editor footer.
4. Persist code drafts through the API.
5. Show saved code in report pages.
6. Add WebSocket room join/presence.
7. Add basic code-change sync.
8. Evaluate whether CRDT-based collaboration is necessary.

## Verification Checklist

For local editor integration:

- technical interview shows editor
- mixed interview shows editor
- behavioral interview does not show editor
- language selector works
- starter code works
- reset works
- navigating between questions does not mix drafts
- refresh restores draft after Phase 2
- mobile layout does not overflow

For API persistence:

- user can save code for their own interview
- user cannot save code for another user's interview
- invalid question ID returns a clear error
- large code payload is rejected
- typechecks pass for API, web, and shared package

For collaboration:

- two browser tabs join the same room
- code changes appear in the other tab
- language changes appear in the other tab
- leaving one tab updates presence
- reconnecting receives the latest document state

## Open Product Questions

- Should code be required for technical questions?
- Should code be submitted separately from written answers?
- Should the report display code by default or behind a disclosure?
- Should AI evaluation include code immediately?
- Which languages should be supported first?
- Do interviewers need read-only or edit access?
- Do we need code execution, or is editing enough for the MVP?

## Recommendation

Start with Phase 1 and Phase 2.

That gives the app a useful code editor experience quickly, keeps the implementation low-risk, and creates a clean foundation for persistence and live collaboration later.

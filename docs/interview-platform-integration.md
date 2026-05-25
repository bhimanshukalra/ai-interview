# Collaborative Code Room Integration

Use this guide to integrate the sibling spike project `../collab-code-room-lab` into this interview app without pulling in spike-only complexity.

The current app already has:

- a Next.js interview flow in `apps/web`
- a Hono API in `apps/api`
- shared Zod schemas in `packages/shared`
- Monaco-based code editing for technical-style interviews
- code saved with answers and shown in reports
- code included in AI answer evaluation

The collaboration work should build on that. It should not replace the existing answer submission, report, or evaluation flow.

## Product Goal

Add a live collaborative editor for technical-style interview questions.

The first useful version should let two authenticated sessions open the same interview question and edit one shared code document with presence, remote cursors, refresh recovery, and final code capture.

Until the app has interviewer assignments, test this with two browser sessions for the interview owner. Add multi-user interview access as a separate step.

## Recommended First Cut

Keep scope narrow:

- one shared code document per interview question
- one language per document
- authenticated room joins
- live Yjs document sync
- participant presence
- remote cursors and selections
- debounced server persistence
- final plain text code saved through the existing answer flow

Defer:

- code execution
- WebRTC
- replay/history UI
- multi-file workspaces
- manual room names
- scheduling
- observer/admin modes
- invisible participants
- detailed audit logs
- conflict-resolution UI beyond Yjs

## Room Identity

Do not use free-form room names in this app.

Use trusted interview data:

```text
roomId = interview:{interviewId}:question:{questionId}
documentId = interview:{interviewId}:question:{questionId}:code
```

The client may pass `interviewId` and `questionId`, but the server must verify ownership before joining or editing.

## Current Code Flow To Preserve

Today, code is submitted with an answer:

```text
interview_answers.code
interview_answers.code_language
```

Keep that as the final interview record because it already powers reports and AI evaluation.

The collaborative Yjs document should be treated as live room state. At answer save time, extract the plain text code from the current Yjs document and submit it through the existing answer API.

This keeps the current product behavior intact while adding collaboration.

## Data Model

Add a durable collaboration document table only when persistence is implemented.

Suggested table:

```sql
interview_code_documents
  id
  interview_id
  question_id
  language
  yjs_snapshot
  updated_at
  created_at
```

Recommended constraints:

```text
unique(interview_id, question_id)
```

Keep final submitted code in the existing `interview_answers` table.

## Access Model

The current MVP has user-owned interviews. It does not yet model assigned interviewers.

Use this progression:

1. First collaboration slice: only the interview owner can join the room. This still validates Yjs sync, persistence, cursors, reconnect, and save-to-answer behavior.
2. Multi-user slice: add an `interview_participants` table or equivalent ownership model, then allow assigned interviewers to join.

Suggested future table:

```sql
interview_participants
  interview_id
  user_id
  role
  created_at
```

Do not block the collaboration infrastructure on interviewer scheduling or invitations.

## Realtime Service Boundary

The current API is a request/response Hono API deployed as a Cloudflare Worker. Keep that API responsible for:

- auth endpoints
- interview CRUD
- answer submission
- reports
- AI evaluation
- database ownership checks

Add realtime collaboration as a separate boundary:

```text
Next.js web app
  -> HTTP interview API for metadata, answers, reports
  -> realtime collaboration service for Yjs sync and presence
```

For the first integration, the quickest path is a small Node realtime service adapted from `collab-code-room-lab`.

If you want a more Cloudflare-native production shape later, evaluate Cloudflare Durable Objects for per-room state. Do that after the Node version proves the UX and data contract.

## What To Reuse From The Lab

Reuse these ideas:

- one `Y.Doc` per active room
- one `Y.Text` named `code`
- initial `yjs-sync`
- incremental `yjs-update`
- `awareness-update` for cursors and selections
- active room map in memory
- debounced persistence using `Y.encodeStateAsUpdate`
- Monaco binding through `MonacoBinding`
- presence list from socket membership
- reconnect and refresh recovery

Use these files as references, not as files to copy blindly:

```text
../collab-code-room-lab/server/src/index.ts
../collab-code-room-lab/server/src/persistence.ts
../collab-code-room-lab/server/src/utils.ts
../collab-code-room-lab/web/src/features/editor/useYjsDocument.ts
../collab-code-room-lab/web/src/features/room/useRoomSocket.ts
../collab-code-room-lab/web/src/features/room/types.ts
../collab-code-room-lab/web/src/features/room/ParticipantsList.tsx
```

Drop the lab's manual room join form. In this app, the route already knows the interview and question.

## Authentication

The web app currently stores the API token in local storage and sends it as a bearer token for HTTP API calls.

For the first cut, the socket can authenticate with the same bearer token:

```ts
const socket = io(realtimeUrl, {
  auth: {
    token,
  },
});
```

On socket connection:

1. Verify the JWT with the same secret used by the API.
2. Resolve the user id.
3. Reject unauthenticated sockets.

On room join:

1. Validate `interviewId` and `questionId`.
2. Load the interview.
3. Confirm the authenticated user owns the interview, or is an assigned participant once multi-user access exists.
4. Confirm the question belongs to the interview.
5. Join `interview:{interviewId}:question:{questionId}`.
6. Send the current Yjs snapshot.
7. Broadcast participant presence.

Longer term, consider moving auth to HTTP-only cookies or short-lived socket tokens. That is a separate hardening step and should not block the first collaboration slice.

## Event Contract

Use interview/question ids at the product boundary.

Client to server:

```ts
type ClientToServerEvents = {
  'join-code-room': (payload: {
    interviewId: string;
    questionId: string;
  }) => void;
  'yjs-update': (payload: {
    interviewId: string;
    questionId: string;
    update: Uint8Array;
  }) => void;
  'awareness-update': (payload: {
    interviewId: string;
    questionId: string;
    update: Uint8Array;
  }) => void;
};
```

Server to client:

```ts
type ServerToClientEvents = {
  'yjs-sync': (payload: {
    interviewId: string;
    questionId: string;
    update: Uint8Array;
    language: string;
  }) => void;
  'yjs-update': (payload: {
    interviewId: string;
    questionId: string;
    update: Uint8Array;
    updatedBy: string;
  }) => void;
  'awareness-update': (payload: {
    interviewId: string;
    questionId: string;
    update: Uint8Array;
    updatedBy: string;
  }) => void;
  'participants-change': (payload: {
    interviewId: string;
    questionId: string;
    participants: Participant[];
  }) => void;
  'code-room-error': (payload: {
    code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_UPDATE' | 'PERSISTENCE_FAILED';
    message: string;
  }) => void;
};
```

Participant shape:

```ts
type Participant = {
  socketId: string;
  userId: string;
  name: string;
  joinedAt: string;
};
```

Do not trust client-supplied participant names or roles. Derive display data from the authenticated user.

## Server Room State

Recommended active room state:

```ts
type ActiveCodeRoom = {
  interviewId: string;
  questionId: string;
  roomId: string;
  doc: Y.Doc;
  language: CodeEditorLanguage;
  participants: Map<string, Participant>;
  saveTimer?: NodeJS.Timeout;
  lastSavedAt?: string;
};
```

On first room load:

1. Look up the persisted `interview_code_documents` row.
2. If a snapshot exists, apply it to a new `Y.Doc`.
3. If no snapshot exists, seed from the current saved answer code or starter code.
4. Store the active room in memory.

On `yjs-update`:

1. Verify the user can edit the interview question.
2. Apply the update to the room document.
3. Broadcast the update to other sockets in the room.
4. Schedule a debounced snapshot save.

On last participant leave:

1. Flush pending persistence.
2. Destroy the `Y.Doc`.
3. Remove the room from memory.

## Frontend Integration

Integrate inside the existing interview feature instead of creating a separate product flow.

Suggested structure:

```text
apps/web/src/features/interviews/code-room/
  code-editor.tsx
  interview-code-room.tsx
  participants-list.tsx
  use-code-room-socket.ts
  use-yjs-code-document.ts
  types.ts
```

The interview session page should:

- load the interview over the existing HTTP API
- decide whether the current question should show a code editor
- connect to the realtime service only when collaboration is enabled
- join with `interviewId` and `questionId`
- render Monaco with Yjs binding
- render participants and connection state
- keep the existing written answer textarea
- on save answer, submit the latest plain text code through the existing answer API

Avoid making the collaborative editor responsible for interview loading, auth redirects, report navigation, or answer evaluation.

## Read-Only Rules

Client read-only mode is UX. Server permissions are security.

Use read-only mode when:

- the interview is completed
- the current user cannot edit the interview
- the room is disconnected and local edits would be misleading

The server must reject `yjs-update` from users who cannot edit.

## Language Handling

Use the existing shared language enum as the source of truth:

```text
CodeEditorLanguageSchema
```

For the first cut, keep language fixed per question/session. Do not add collaborative language switching yet.

Persist language outside the Yjs text document. The Yjs text should contain code only.

## Save Answer Behavior

When the user clicks save answer:

1. Read the plain text code from `doc.getText('code').toString()`.
2. Read the selected language from room state.
3. Call the existing answer submission API with `answer`, `code`, and `codeLanguage`.
4. Let the existing report and AI evaluation flow continue unchanged.

This is the cleanest integration point because reports and Gemini evaluation already understand saved code.

## Failure Handling

Handle these cases explicitly:

- socket auth fails
- user does not own or cannot access the interview
- question does not belong to the interview
- Yjs snapshot load fails
- Yjs snapshot save fails
- malformed Yjs update arrives
- server restarts during an active room
- participant reconnects with a new socket id

Minimum UI states:

- connected
- syncing
- reconnecting
- read-only
- save failed
- unauthorized

## Rollout Plan

Recommended sequence:

1. Add shared room/event types.
2. Add the realtime service using the lab as reference.
3. Add `interview_code_documents` persistence.
4. Add authenticated socket join.
5. Add the collaborative editor behind a feature flag.
6. Connect only technical-style interview questions.
7. Save final plain text code through the existing answer API.
8. Show participants, cursors, and connection state.
9. Test refresh, reconnect, and server restart recovery.
10. Remove the feature flag after manual acceptance passes.

## Manual Acceptance Test

Before calling the integration complete:

- User can join only their own interview room in the first slice.
- A different account cannot join someone else's interview room.
- Two browser sessions for the same authorized user see the same code document.
- Typing in one browser updates the other browser.
- Remote cursor and selection appear.
- Refresh restores the latest code.
- Temporary disconnect reconnects to the same document.
- Server restart restores the latest persisted snapshot.
- Saving an answer stores the latest code in `interview_answers`.
- The report shows the saved code.
- AI evaluation includes the saved code.
- Completed interviews do not accept collaborative edits.

## Not Part Of This Integration

These are still valuable, but they belong to later roadmap items:

- sandboxed code execution
- WebRTC video rooms
- multi-file collaborative workspaces
- interviewer scheduling
- replay/history timeline
- admin review mode
- analytics dashboards

Keeping those out of the first cut makes the collaboration integration much smoother and easier to finish.

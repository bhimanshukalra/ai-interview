# Collaborative Code Room Integration Phases

This checklist breaks the `../collab-code-room-lab` integration into implementation phases for this repo.

Use this alongside `docs/interview-platform-integration.md`. That guide explains the architecture; this file is the work plan.

## Integration Principle

Keep the existing interview answer flow as the source of truth.

The collaborative room owns live editing state. The current answer API still owns the final submitted code used by reports and AI evaluation.

## Phase 1: Shared Contracts

Goal: define the room contract before wiring runtime code.

Steps:

- [x] Add shared collaborative room schemas/types under `packages/shared`.
- [x] Define `join-code-room`, `yjs-sync`, `yjs-update`, `awareness-update`, `participants-change`, and `code-room-error` payloads.
- [x] Reuse `CodeEditorLanguageSchema` instead of creating a second language enum.
- [x] Add a room id helper for `interview:{interviewId}:question:{questionId}`.
- [x] Add validation for `interviewId` and `questionId` payloads.

Done when:

- [x] Web/API/realtime code can import one shared event contract.
- [x] Typecheck passes across the workspace.

## Phase 2: Collaboration Persistence

Goal: store live Yjs snapshots without changing final answer storage.

Steps:

- [ ] Add `interview_code_documents` to the API database schema.
- [ ] Add a migration for `interview_code_documents`.
- [ ] Store `interview_id`, `question_id`, `language`, `yjs_snapshot`, `created_at`, and `updated_at`.
- [ ] Add a unique constraint for `interview_id` plus `question_id`.
- [ ] Add small service helpers to load, upsert, and update code document snapshots.
- [ ] Keep final submitted code in `interview_answers.code`.

Done when:

- [ ] A persisted Yjs snapshot can be loaded by interview/question.
- [ ] The existing answer submission and report flow still works unchanged.

## Phase 3: Realtime Service Scaffold

Goal: bring in the lab's realtime loop as a separate service boundary.

Steps:

- [ ] Add a realtime workspace app or service package for Socket.IO/Yjs.
- [ ] Adapt the lab server entrypoint from `../collab-code-room-lab/server/src/index.ts`.
- [ ] Add active room state with one `Y.Doc` per interview question room.
- [ ] Add room creation and cleanup lifecycle.
- [ ] Add basic health route or startup log for local development.
- [ ] Add local environment variables for database URL, JWT secret, and allowed web origin.

Done when:

- [ ] The realtime service can start locally.
- [ ] A local socket client can connect and receive a simple acknowledgement.

## Phase 4: Socket Authentication And Authorization

Goal: make room access match the existing interview ownership model.

Steps:

- [ ] Authenticate sockets with the current bearer token.
- [ ] Verify JWTs with the same secret used by the API.
- [ ] Resolve the authenticated user id and display name.
- [ ] On `join-code-room`, load the interview and question.
- [ ] Allow only the interview owner in the first slice.
- [ ] Reject unauthorized joins with `code-room-error`.
- [ ] Reject edits from unauthorized sockets.

Done when:

- [ ] The interview owner can join a room.
- [ ] A different user cannot join the same room.
- [ ] Unauthorized updates are rejected server-side.

## Phase 5: Yjs Sync And Awareness

Goal: make two authorized browser sessions share one code document.

Steps:

- [ ] On join, load or create the room `Y.Doc`.
- [ ] If a persisted snapshot exists, apply it.
- [ ] If no snapshot exists, seed from saved answer code or the editor starter code.
- [ ] Send `yjs-sync` to the joining socket.
- [ ] Apply and broadcast `yjs-update` events.
- [ ] Relay `awareness-update` events without persisting them.
- [ ] Broadcast `participants-change` on join and disconnect.
- [ ] Debounce snapshot persistence after updates.
- [ ] Flush the latest snapshot when the last participant leaves.

Done when:

- [ ] Typing in one browser updates the other.
- [ ] Presence updates on join and leave.
- [ ] Remote cursors and selections move between sessions.
- [ ] Refresh restores the latest persisted code.

## Phase 6: Web App Integration

Goal: replace the local-only code editor state with collaborative state for supported questions.

Steps:

- [ ] Add a code-room feature folder under `apps/web/src/features/interviews`.
- [ ] Adapt the lab hooks from `../collab-code-room-lab/web/src/features/room/useRoomSocket.ts`.
- [ ] Adapt the Yjs/Monaco binding from `../collab-code-room-lab/web/src/features/editor/useYjsDocument.ts`.
- [ ] Connect only when the current interview question should show the code editor.
- [ ] Join with the current `interviewId` and `questionId`.
- [ ] Render participants and connection state near the editor.
- [ ] Disable editing when the room is disconnected or the interview is completed.
- [ ] Keep the existing written answer textarea and save button flow.

Done when:

- [ ] The interview page shows a collaborative editor for technical-style questions.
- [ ] Non-code interview questions keep the current UI.
- [ ] Connection and error states are visible to the user.

## Phase 7: Save Answer Integration

Goal: make final saved code flow through the existing answer/report/evaluation pipeline.

Steps:

- [ ] On save answer, read `doc.getText('code').toString()`.
- [ ] Send `code` and `codeLanguage` through the existing submit-answer API.
- [ ] Keep existing answer validation from shared schemas.
- [ ] Confirm the report displays the saved code.
- [ ] Confirm AI evaluation receives the saved code.
- [ ] Decide whether save should also force-flush the latest Yjs snapshot.

Done when:

- [ ] Saving an answer persists the latest collaborative code in `interview_answers`.
- [ ] Reports and AI evaluation continue to work without a new final-code API.

## Phase 8: Recovery And Hardening

Goal: make the first cut reliable enough to demo.

Steps:

- [ ] Handle socket auth failures.
- [ ] Handle forbidden joins.
- [ ] Handle malformed Yjs updates.
- [ ] Handle persistence load and save failures.
- [ ] Handle reconnect with a new socket id.
- [ ] Prevent duplicate participant rows.
- [ ] Add logs for join, disconnect, forbidden edit, save failure, and room cleanup.
- [ ] Add manual restart testing for persisted snapshots.

Done when:

- [ ] Refresh, reconnect, and server restart recover the latest saved document.
- [ ] Failure states are visible without losing the written answer.

## Phase 9: Multi-User Interview Access

Goal: move beyond owner-only testing when the core collaboration loop is stable.

Steps:

- [ ] Add an `interview_participants` table or equivalent access model.
- [ ] Add roles such as `candidate` and `interviewer`.
- [ ] Update room authorization to allow assigned participants.
- [ ] Decide whether interviewers can edit or only observe.
- [ ] Show participant roles in the room UI.
- [ ] Add acceptance tests for candidate/interviewer access.

Done when:

- [ ] Candidate and interviewer accounts can join the same interview room.
- [ ] Unauthorized users are still blocked.

## Manual Acceptance Test

Run this before calling the integration complete:

- [ ] Owner can join their own interview code room.
- [ ] Another user cannot join someone else's room.
- [ ] Two authorized sessions see the same code.
- [ ] Typing syncs both ways.
- [ ] Remote cursor and selection appear.
- [ ] Presence updates on join and leave.
- [ ] Refresh restores latest code.
- [ ] Temporary disconnect reconnects to the same document.
- [ ] Server restart restores latest persisted snapshot.
- [ ] Saving an answer stores latest code in `interview_answers`.
- [ ] Report shows saved code.
- [ ] AI evaluation includes saved code.
- [ ] Completed interviews do not accept collaborative edits.

## Recommended First Implementation Order

Start here:

1. Phase 1: Shared Contracts
2. Phase 2: Collaboration Persistence
3. Phase 3: Realtime Service Scaffold
4. Phase 4: Socket Authentication And Authorization
5. Phase 5: Yjs Sync And Awareness
6. Phase 6: Web App Integration
7. Phase 7: Save Answer Integration
8. Phase 8: Recovery And Hardening

Leave Phase 9 until the room works reliably for owner-only sessions.

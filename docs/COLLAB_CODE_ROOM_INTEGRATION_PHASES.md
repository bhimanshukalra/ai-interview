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

- [x] Add `interview_code_documents` to the API database schema.
- [x] Add a migration for `interview_code_documents`.
- [x] Store `interview_id`, `question_id`, `language`, `yjs_snapshot`, `created_at`, and `updated_at`.
- [x] Add a unique constraint for `interview_id` plus `question_id`.
- [x] Add small service helpers to load, upsert, and update code document snapshots.
- [x] Keep final submitted code in `interview_answers.code`.

Done when:

- [x] A persisted Yjs snapshot can be loaded by interview/question.
- [x] The existing answer submission and report flow still works unchanged.

## Phase 3: Realtime Service Scaffold

Goal: bring in the lab's realtime loop as a separate service boundary.

Steps:

- [x] Add a realtime workspace app or service package for Socket.IO/Yjs.
- [x] Adapt the lab server entrypoint from `../collab-code-room-lab/server/src/index.ts`.
- [x] Add active room state with one `Y.Doc` per interview question room.
- [x] Add room creation and cleanup lifecycle.
- [x] Add basic health route or startup log for local development.
- [x] Add local environment variables for database URL, JWT secret, and allowed web origin.

Done when:

- [x] The realtime service can start locally.
- [x] A local socket client can connect and receive a simple acknowledgement.

## Phase 4: Socket Authentication And Authorization

Goal: make room access match the existing interview ownership model.

Steps:

- [x] Authenticate sockets with the current bearer token.
- [x] Verify JWTs with the same secret used by the API.
- [x] Resolve the authenticated user id and display name.
- [x] On `join-code-room`, load the interview and question.
- [x] Allow only the interview owner in the first slice.
- [x] Reject unauthorized joins with `code-room-error`.
- [x] Reject edits from unauthorized sockets.

Done when:

- [x] The interview owner can join a room.
- [x] A different user cannot join the same room.
- [x] Unauthorized updates are rejected server-side.

## Phase 5: Yjs Sync And Awareness

Goal: make two authorized browser sessions share one code document.

Steps:

- [x] On join, load or create the room `Y.Doc`.
- [x] If a persisted snapshot exists, apply it.
- [x] If no snapshot exists, seed from saved answer code or the editor starter code.
- [x] Send `yjs-sync` to the joining socket.
- [x] Apply and broadcast `yjs-update` events.
- [x] Relay `awareness-update` events without persisting them.
- [x] Broadcast `participants-change` on join and disconnect.
- [x] Debounce snapshot persistence after updates.
- [x] Flush the latest snapshot when the last participant leaves.

Done when:

- [ ] Typing in one browser updates the other.
- [ ] Presence updates on join and leave.
- [ ] Remote cursors and selections move between sessions.
- [ ] Refresh restores the latest persisted code.

Note: the server-side sync, awareness, and persistence loop is implemented. These browser acceptance checks need the Phase 6 web client integration.

## Phase 6: Web App Integration

Goal: replace the local-only code editor state with collaborative state for supported questions.

Steps:

- [x] Add a code-room feature folder under `apps/web/src/features/interviews`.
- [x] Adapt the lab hooks from `../collab-code-room-lab/web/src/features/room/useRoomSocket.ts`.
- [x] Adapt the Yjs/Monaco binding from `../collab-code-room-lab/web/src/features/editor/useYjsDocument.ts`.
- [x] Connect only when the current interview question should show the code editor.
- [x] Join with the current `interviewId` and `questionId`.
- [x] Render participants and connection state near the editor.
- [x] Disable editing when the room is disconnected or the interview is completed.
- [x] Keep the existing written answer textarea and save button flow.

Done when:

- [x] The interview page shows a collaborative editor for technical-style questions.
- [x] Non-code interview questions keep the current UI.
- [x] Connection and error states are visible to the user.

## Phase 7: Save Answer Integration

Goal: make final saved code flow through the existing answer/report/evaluation pipeline.

Steps:

- [x] On save answer, read `doc.getText('code').toString()`.
- [x] Send `code` and `codeLanguage` through the existing submit-answer API.
- [x] Keep existing answer validation from shared schemas.
- [x] Confirm the report displays the saved code.
- [x] Confirm AI evaluation receives the saved code.
- [x] Decide whether save should also force-flush the latest Yjs snapshot.

Done when:

- [x] Saving an answer persists the latest collaborative code in `interview_answers`.
- [x] Reports and AI evaluation continue to work without a new final-code API.

Decision: save does not force-flush the Yjs snapshot. The answer API remains the final-code source of truth for reports and AI evaluation, while the realtime service continues to persist live collaboration snapshots through its debounce and room cleanup flow.

## Phase 8: Recovery And Hardening

Goal: make the first cut reliable enough to demo.

Steps:

- [x] Handle socket auth failures.
- [x] Handle forbidden joins.
- [x] Handle malformed Yjs updates.
- [x] Handle persistence load and save failures.
- [x] Handle reconnect with a new socket id.
- [x] Prevent duplicate participant rows.
- [x] Add logs for join, disconnect, forbidden edit, save failure, and room cleanup.
- [x] Add manual restart testing for persisted snapshots.

Done when:

- [ ] Refresh, reconnect, and server restart recover the latest saved document.
- [ ] Failure states are visible without losing the written answer.

Manual persisted snapshot restart check:

- Start API, web, and realtime services with the same database.
- Open an interview with a code-capable question.
- Type a unique code comment in the collaborative editor.
- Wait for the editor status to return to `Synced`.
- Stop and restart the realtime service.
- Refresh the interview page.
- Confirm the unique code comment is restored in the editor.
- Save the answer and confirm the report still shows the same code.

## Phase 9: Multi-User Interview Access

Goal: move beyond owner-only testing when the core collaboration loop is stable.

Steps:

- [x] Add an `interview_participants` table or equivalent access model.
- [x] Add roles such as `candidate` and `interviewer`.
- [x] Update room authorization to allow assigned participants.
- [x] Decide whether interviewers can edit or only observe.
- [x] Show participant roles in the room UI.
- [x] Add acceptance tests for candidate/interviewer access.

Done when:

- [x] Candidate and interviewer accounts can join the same interview room.
- [x] Unauthorized users are still blocked.

Decision: owners and candidates can edit code and save answers. Interviewers can join the code room as read-only observers.

Candidate/interviewer acceptance checks:

- Add a `candidate` row in `interview_participants` for a second user and the interview.
- Confirm that user can open the interview page, join the room, edit code, and save the answer.
- Add an `interviewer` row in `interview_participants` for a third user and the interview.
- Confirm that user can open the interview page and join the room, but the editor is read-only.
- Confirm a user without an owner or participant record cannot open the interview or join the room.

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

## Follow-Up Cleanup

- [ ] Before deleting `apps/web/src/components/code-editor-panel.tsx`, decide whether to migrate its remaining UI affordances into the collaborative editor: language selector, starter templates, `Starter`, and `Reset`.

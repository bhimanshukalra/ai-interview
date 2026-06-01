# WebRTC Integration Phases

This plan adapts `docs/WEBRTC_FEATURE_REFERENCE.md` into this interview platform.

The reference project proves the WebRTC mechanics. This app needs the same core video-call capabilities, but with interview-aware room identity, JWT-authenticated sockets, and access rules that match the existing collaborative editor.

## Product Goal

Add a functioning interview video room alongside the current interview session features:

- local camera preview
- remote participant video
- microphone mute/unmute
- camera on/off
- remote mic/camera status labels
- call/signaling/peer/ICE status indicators
- end-call cleanup
- tab-close/disconnect cleanup
- interview access enforcement

The first version should support a practical two-person interview call. The architecture should avoid blocking future multi-participant support.

## Architecture Direction

Use the existing realtime service for signaling.

```text
apps/web
  -> interview API for interview data and access
  -> apps/realtime for WebRTC signaling

apps/realtime
  -> authenticates sockets with the existing JWT
  -> verifies interview room access through the database
  -> forwards offer/answer/ICE/media-status events
  -> does not carry audio or video
```

Actual media remains browser-to-browser through WebRTC:

```text
Browser A  <---------- WebRTC media ---------->  Browser B
    |                                             |
    +------------- Socket.IO signaling ----------+
```

## Architecture Changes Needed

The current realtime architecture is good enough to extend, but WebRTC should not be mixed directly into the code-room handlers.

Recommended structure:

```text
apps/realtime/src/socket/
  code-room/
    events.ts
    handlers/
  video-room/
    events.ts
    handlers/
    participants.ts
```

Current code-room files can stay as-is for the first slice if we want minimal churn, but before WebRTC grows large, split socket registration by feature:

```text
registerCodeRoomEvents(...)
registerVideoRoomEvents(...)
```

Shared contracts should also stay feature-specific:

```text
packages/shared/src/schemas/code-room.ts
packages/shared/src/schemas/video-room.ts
```

## Key Differences From The Reference Project

Do not port these parts directly:

- room join by free-form email
- direct room URL identity from `sessionStorage`
- unauthenticated room joins
- standalone video-only page as the primary flow

Use these instead:

- join by trusted `interviewId`
- authenticate sockets with the current API token
- resolve display name from the authenticated user
- authorize through interview owner/participant access
- render video inside the existing interview session

## Room Identity

Use one video room per interview:

```text
videoRoomId = interview:{interviewId}:video
```

The client sends only:

```ts
{
  interviewId: string;
}
```

The realtime service derives the room id after validating access.

## Access Policy

First version:

- interview owner can join
- `candidate` participants can join
- `interviewer` participants can join
- unauthorized users are rejected
- completed/report-ready interviews can still allow video join unless we explicitly decide otherwise

Editing rules from the code room do not apply to video. Interviewers are read-only for code, but they should still be full video participants.

## Event Contract

Add shared event constants and schemas for video signaling.

Suggested events:

```text
join-video-room
video-room-joined
video-participants-change
video-user-joined
video-offer
video-answer
video-ice-candidate
video-media-toggle
leave-video-room
video-user-left
video-room-error
```

Suggested payloads:

```ts
JoinVideoRoomPayload = {
  interviewId: string;
};

VideoParticipant = {
  socketId: string;
  userId: string;
  name: string;
  role: 'candidate' | 'interviewer';
  audioEnabled: boolean;
  videoEnabled: boolean;
  joinedAt: string;
};

VideoOfferPayload = {
  interviewId: string;
  targetSocketId: string;
  offer: RTCSessionDescriptionInit;
};

VideoAnswerPayload = {
  interviewId: string;
  targetSocketId: string;
  answer: RTCSessionDescriptionInit;
};

VideoIceCandidatePayload = {
  interviewId: string;
  targetSocketId: string;
  candidate: RTCIceCandidateInit;
};

VideoMediaTogglePayload = {
  interviewId: string;
  kind: 'audio' | 'video';
  enabled: boolean;
};
```

Use `targetSocketId`, not email, because this app already has authenticated socket identities.

## Frontend Structure

Add a video-room feature folder:

```text
apps/web/src/features/interviews/video-room/
  interview-video-room.tsx
  video-tile.tsx
  video-controls.tsx
  use-video-room-socket.ts
  use-peer-connection.ts
  use-local-media.ts
  types.ts
```

Responsibilities:

- `InterviewVideoRoom` coordinates the feature and renders UI.
- `useVideoRoomSocket` owns signaling events.
- `usePeerConnection` owns `RTCPeerConnection`.
- `useLocalMedia` owns `getUserMedia`, track toggles, and cleanup.
- `VideoTile` attaches `MediaStream` through `video.srcObject`.
- `VideoControls` renders mute/camera/end-call buttons.

## UI Placement

Render video inside the interview session, near the collaborative workspace.

Recommended first layout:

```text
Interview session
  Question / answer
  Collaborative code editor
  Video room panel
```

For desktop, the video panel can sit above or beside the editor depending on available space. For mobile, stack it above the editor.

Initial video layout:

```text
+----------------------------------+
|          Remote video            |
|                         +------+ |
|                         | You  | |
|                         +------+ |
+----------------------------------+
```

Controls:

- mute/unmute microphone
- camera on/off
- end call
- status badges for signaling, peer, and ICE state

## Phase 1: Shared Contracts

Goal: define the video-room socket contract before runtime wiring.

Steps:

- [x] Add `packages/shared/src/schemas/video-room.ts`.
- [x] Define video room event constants.
- [x] Define join, participant, offer, answer, ICE, media-toggle, leave, and error payload schemas.
- [x] Export schemas and inferred types from `packages/shared/src/index.ts`.
- [x] Use existing participant role schema rather than creating a second role enum.

Done when:

- [x] Web and realtime can import one shared video-room contract.
- [x] Typecheck passes.

## Phase 2: Realtime Signaling Boundary

Goal: add authenticated WebRTC signaling without touching media streams.

Steps:

- [x] Add video-room handlers under `apps/realtime`.
- [x] Register video-room events separately from code-room events.
- [x] Authenticate sockets with the existing JWT middleware.
- [x] Authorize `join-video-room` against interview owner/participant access.
- [x] Track active video participants by socket id.
- [x] Broadcast participant changes on join/leave/disconnect.
- [x] Forward offer, answer, and ICE candidate payloads to target sockets.
- [x] Forward media-toggle status to other room participants.
- [x] Emit clear `video-room-error` events for unauthorized or malformed payloads.

Done when:

- [x] Authorized users can join a video room.
- [x] Unauthorized users are rejected server-side.
- [x] Offer/answer/ICE messages are forwarded only inside authorized rooms.

## Phase 3: Local Media And Video UI

Goal: get camera/microphone access and render a safe local preview.

Steps:

- [x] Add `useLocalMedia`.
- [x] Request `getUserMedia({ audio: true, video: true })` only when the video room is opened.
- [x] Render local preview with `video.srcObject`.
- [x] Add mic mute/unmute by setting `audioTrack.enabled`.
- [x] Add camera on/off by setting `videoTrack.enabled`.
- [x] Stop tracks on end call and unmount.
- [x] Guard against late `getUserMedia` resolution after unmount.
- [x] Handle permission denial with visible UI.

Done when:

- [x] User sees their own preview.
- [x] Mute/camera controls affect local tracks.
- [x] Leaving the room stops camera/microphone access.

## Phase 4: Peer Connection

Goal: establish a two-person WebRTC call.

Steps:

- [x] Add `usePeerConnection`.
- [x] Create one `RTCPeerConnection` for the first remote participant.
- [x] Add local tracks before creating offers or answers.
- [x] Send `video-offer` when another participant joins.
- [x] Create and send `video-answer` on incoming offer.
- [x] Add remote answer on caller side.
- [x] Exchange ICE candidates in both directions.
- [x] Render remote stream on `track` event.
- [x] Track `connectionState` and `iceConnectionState`.
- [x] Clear remote stream when the peer leaves.

Done when:

- [ ] Two authorized users see and hear each other.
- [x] Status badges reflect signaling, peer, and ICE state.

## Phase 5: Media Status And Cleanup

Goal: make call state understandable and reliable.

Steps:

- [x] Emit `video-media-toggle` when local audio/video enabled state changes.
- [x] Show remote labels for muted mic and camera off.
- [x] Add `End call` button.
- [x] Emit `leave-video-room` on end call.
- [x] Handle tab close and socket disconnect server-side.
- [x] Show a user-left message when the remote participant leaves.
- [x] Remove local senders and stop tracks on end call.
- [x] Clear `video.srcObject` on unmount.

Done when:

- [ ] Remote user sees mic/camera status changes.
- [ ] End call cleans up local media and notifies the remote user.
- [ ] Tab close/reload removes the participant from the room.

## Phase 6: Interview App Integration

Goal: make video feel native to this product.

Steps:

- [x] Render `InterviewVideoRoom` in `InterviewSession`.
- [x] Join by `interviewId`, not room id or email.
- [x] Use authenticated user identity from the existing API token.
- [x] Reuse interview participant roles.
- [x] Keep video independent from answer saving and code sync.
- [x] Add responsive layout for desktop and mobile.
- [x] Add loading/error/empty states consistent with existing UI.

Done when:

- [ ] An interview participant can start/join a video call from the interview session.
- [ ] Code editor, written answer, and video controls can be used together.

## Phase 7: Reconnect And Hardening

Goal: make the feature demo-safe.

Steps:

- [x] Handle signaling reconnect.
- [x] Rejoin the video room after socket reconnect.
- [x] Recreate peer connection after failed/disconnected peer state when needed.
- [x] Add STUN config.
- [x] Document TURN as required for production-grade reliability.
- [x] Add logs for join, leave, forwarded signaling, forbidden signaling, and cleanup.
- [x] Add focused tests for realtime authorization and payload validation.

Done when:

- [ ] Refresh and reconnect behavior is predictable.
- [ ] Failure states are visible without leaving camera/mic active.

## Phase 8: Future Multi-Participant Shape

Goal: avoid painting the architecture into a two-person corner.

Do not implement this in the first slice unless needed.

Future direction:

- one `RTCPeerConnection` per remote participant
- participants keyed by socket id
- remote streams stored in a map
- per-participant media status
- grid layout for multiple remote tiles

The two-person implementation should use data structures that can evolve toward this, even if the UI only supports one remote participant first.

## Manual Acceptance Checklist

- [ ] Owner can join a video room.
- [ ] Candidate participant can join the same video room.
- [ ] Interviewer participant can join the same video room.
- [ ] Unauthorized user cannot join.
- [ ] Both participants see local preview.
- [ ] Both participants see remote video.
- [ ] Both participants hear remote audio.
- [ ] Mic mute updates local track and remote label.
- [ ] Camera off updates local track and remote label.
- [ ] End call stops camera/mic access.
- [ ] End call notifies the remote participant.
- [ ] Tab close/reload removes the participant.
- [ ] Signaling, peer, and ICE statuses update.
- [ ] Permission denial shows a useful error.
- [ ] Written answer and code editor still work while video is active.

## Known Limitations For First Version

- Two-person call only.
- No TURN server by default. The current STUN-only configuration is useful for local demos and simple networks, but production-grade reliability requires TURN credentials from a managed provider or a self-hosted TURN service.
- No screen sharing.
- No device picker.
- No recording.
- No persisted call history.
- No network quality indicators.

These are acceptable for the first integration because the goal is a working interview video call, not a full conferencing product.

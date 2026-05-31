# WebRTC Feature Reference

This project started as a learning experiment, but it now contains a useful set of WebRTC room features that can be copied back into a larger application.

This document summarizes what was built, why each piece exists, and what to look for when porting it.

## Feature List

The current implementation includes:

- two-person WebRTC video call
- Socket.IO signaling server
- room join by email and room id
- WebRTC offer/answer exchange
- ICE candidate exchange
- local camera preview
- remote video display
- local microphone mute/unmute
- local camera on/off
- remote mic/camera status labels
- call status badges
- signaling connection status
- peer connection status
- ICE connection status
- end call button
- leave-room signaling
- tab close cleanup
- user-left toast
- direct room URL handling
- local self-preview pinned bottom-right
- remote video in the main center area
- video name labels

## High-Level Architecture

The app has two main parts:

```txt
web/      React frontend
server/   Socket.IO signaling server
```

The server does not carry audio or video. It only forwards signaling messages.

Actual media flows through WebRTC:

```txt
Browser A  <---------- WebRTC media ---------->  Browser B
    |                                             |
    +------------- Socket.IO signaling ----------+
```

## Core WebRTC Concepts Used

### MediaStream

Local camera and microphone are requested with:

```ts
navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true,
});
```

This returns a `MediaStream`.

The stream is shown in a video element using `srcObject`:

```ts
videoElement.srcObject = mediaStream;
```

Do not use:

```tsx
<video src={mediaStream} />
```

`src` is for URLs. `srcObject` is for live streams.

### RTCPeerConnection

The app uses one `RTCPeerConnection` for a two-person call.

The peer connection:

- creates offers
- creates answers
- sends local media tracks
- receives remote media tracks
- exchanges ICE candidates
- exposes connection state

For multi-participant rooms, this needs to become one peer connection per remote participant.

## Socket Events

These are the current signaling events.

### `join-room`

Client sends:

```ts
socket.emit('join-room', { emailId, roomId });
```

Server stores:

- email to socket id
- socket id to email
- socket id to room

Server responds to the joining socket:

```ts
socket.emit('joined-room', { roomId });
```

Server notifies other users in the room:

```ts
socket.broadcast.to(roomId).emit('user-joined', { emailId });
```

### `call-user`

Used to send a WebRTC offer to another user.

Client sends:

```ts
socket.emit('call-user', { emailId, offer });
```

Server forwards:

```ts
socket.to(socketId).emit('incoming-call', {
  fromEmail,
  offer,
});
```

### `call-accepted`

Used to send a WebRTC answer back to the caller.

Client sends:

```ts
socket.emit('call-accepted', { emailId, answer });
```

Server forwards:

```ts
socket.to(socketId).emit('call-accepted', { answer });
```

### `ice-candidate`

Used to exchange ICE candidates.

Client sends:

```ts
socket.emit('ice-candidate', {
  emailId,
  candidate,
});
```

Server forwards:

```ts
socket.to(socketId).emit('ice-candidate', { candidate });
```

This is important. Offer/answer alone is not enough for reliable WebRTC connection setup.

### `media-toggle`

Used to tell the remote user when camera or microphone state changes.

Client sends:

```ts
socket.emit('media-toggle', {
  emailId,
  kind: 'audio',
  enabled: false,
});
```

or:

```ts
socket.emit('media-toggle', {
  emailId,
  kind: 'video',
  enabled: false,
});
```

Server forwards:

```ts
socket.to(socketId).emit('media-toggle', {
  kind,
  enabled,
});
```

The receiver updates labels such as:

```txt
Mic muted
Camera off
```

### `leave-room`

Used when a user clicks `End call`.

Client sends:

```ts
socket.emit('leave-room');
```

Server removes the user from room mappings and emits:

```ts
socket.to(roomId).emit('user-left', { emailId });
```

### `disconnect`

Used when a tab closes, reloads, or loses connection.

The server handles Socket.IO `disconnect`, removes the user from room mappings, and emits `user-left` to the rest of the room.

Do not rely only on browser `beforeunload` to notify the server. It is not reliable for async work.

## Provider Responsibilities

### Socket Provider

The socket provider owns the Socket.IO client.

It exposes:

```ts
socket
signalingState
```

`signalingState` can be:

```ts
'connected' | 'disconnected' | 'reconnecting'
```

It listens to:

```ts
socket.on('connect', ...)
socket.on('disconnect', ...)
socket.io.on('reconnect_attempt', ...)
socket.io.on('reconnect', ...)
```

This lets the UI show signaling status.

### Peer Provider

The peer provider owns the `RTCPeerConnection`.

It exposes helpers like:

```ts
createOffer()
createAnswer(offer)
setRemoteAnswer(answer)
addIceCandidate(candidate)
sendStream(stream)
clearRemoteUserStream()
```

It also exposes:

```ts
remoteUserStream
connectionState
iceConnectionState
```

The provider listens to:

```ts
peer.addEventListener('track', ...)
peer.addEventListener('connectionstatechange', ...)
peer.addEventListener('iceconnectionstatechange', ...)
```

## Room Page Responsibilities

The room page coordinates the call.

It handles:

- reading `roomId` from the URL
- reading `emailId` from route state or session storage
- redirecting home when email is missing
- requesting camera/mic
- adding local tracks before creating offer/answer
- sending offers
- answering incoming offers
- sending ICE candidates
- receiving ICE candidates
- toggling camera/mic tracks
- sending media-toggle events
- showing status badges
- stopping tracks on end call
- stopping tracks on tab close/unmount
- clearing remote stream when user leaves

## Important Implementation Details

### Add Tracks Before Creating Offer Or Answer

For media to appear on the remote side, add local tracks before creating the offer or answer:

```ts
sendStream(localStream);
const offer = await createOffer();
```

and:

```ts
sendStream(localStream);
const answer = await createAnswer(offer);
```

If tracks are added too late, the SDP may not advertise audio/video correctly.

### Do Not Stop Tracks For Mute

For camera/mic toggle, use:

```ts
track.enabled = false;
```

Do not use:

```ts
track.stop();
```

`enabled = false` keeps the WebRTC connection alive and sends silence/black frames.

`stop()` ends the track permanently and requires reacquiring media.

### Stop Tracks For End Call

For ending the call, do stop tracks:

```ts
for (const track of stream.getTracks()) {
  track.stop();
}
```

Also remove local senders from the peer connection:

```ts
for (const sender of peer.getSenders()) {
  if (sender.track) {
    sender.track.stop();
    peer.removeTrack(sender);
  }
}
```

This prevents the browser from continuing to access the camera after leaving the room.

### Clear `srcObject`

When a video component unmounts or switches streams, clear the video element:

```ts
videoElement.srcObject = null;
```

This avoids leaving the element holding a reference to an old stream.

### Handle Late `getUserMedia`

`getUserMedia()` is async. The user can leave before it resolves.

Use an active flag:

```ts
if (!isRoomActiveRef.current) {
  stream.getTracks().forEach((track) => track.stop());
  return stream;
}
```

This prevents late camera access after navigating away.

### React StrictMode Caveat

In development, React StrictMode can mount, cleanup, and remount effects.

If you use an active flag, reset it to `true` when the room effect sets up:

```ts
useEffect(() => {
  isRoomActiveRef.current = true;

  return () => {
    isRoomActiveRef.current = false;
    stopCurrentUserStream();
  };
}, []);
```

Without this, development mode can accidentally mark the room inactive and immediately stop the camera.

## UI Features

### Main Layout

The remote video appears in the center/main area.

The current user's preview is pinned to the bottom-right.

This matches common video-call layouts:

```txt
+----------------------------------+
|                                  |
|          Remote video            |
|                                  |
|                         +------+ |
|                         | You  | |
|                         +------+ |
+----------------------------------+
```

### Video Labels

Each video has a bottom label:

```txt
jake
bhimanshu (You)
```

Remote labels can also show media status:

```txt
jake
Mic muted · Camera off
```

### Status Badges

The room shows:

```txt
Signaling connected
Peer connected
ICE connected
```

These are useful for debugging.

## Direct Room URL Behavior

The app stores the email in `sessionStorage`:

```ts
sessionStorage.setItem('webrtc-video-room-email-id', emailId);
```

If a user visits `/room/:roomId` and no email is known, the app redirects to `/`.

This keeps the room route simple and avoids joining a room without identity.

## Porting Checklist

When adding these features to another project, port in this order:

1. Add Socket.IO signaling server.
2. Add `SocketProvider`.
3. Add `PeerProvider`.
4. Add room join by email and room id.
5. Add local `getUserMedia`.
6. Add `VideoPlayer` using `srcObject`.
7. Add offer/answer signaling.
8. Add ICE candidate signaling.
9. Add remote stream rendering.
10. Add camera/mic toggles.
11. Add media-toggle status events.
12. Add signaling, peer, and ICE status badges.
13. Add leave-room and disconnect cleanup.
14. Add end call cleanup that stops tracks and removes senders.
15. Add direct room URL behavior.
16. Add final UI polish.

## Manual Test Checklist

Use this checklist after porting:

- Can user A join a room?
- Can user B join the same room?
- Do both users see remote video?
- Do both users hear remote audio?
- Does camera off update the remote user's UI?
- Does mic mute update the remote user's UI?
- Does end call stop camera access?
- Does end call notify the other user?
- Does closing the tab notify the other user?
- Does direct `/room/:roomId` redirect home when email is missing?
- Does refreshing the room work when email is saved?
- Do signaling, peer, and ICE statuses update?

## Known Limitations

This is still a learning implementation.

Before using this in production, consider:

- authentication
- authorization for room access
- TURN server support
- multi-participant architecture
- full peer reconnection after failure
- better error handling for media permissions
- device picker for camera/microphone
- screen sharing
- network quality indicators

## Related Notes

For multi-participant planning, see:

```txt
MULTI_PARTICIPANT_PLAN.md
```

That document explains how to move from one peer connection to one peer connection per remote participant.

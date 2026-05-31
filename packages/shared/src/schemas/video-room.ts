import { z } from 'zod';
import { InterviewParticipantRoleSchema } from './code-room';

export const VideoRoomSocketEvent = {
  JoinVideoRoom: 'join-video-room',
  LeaveVideoRoom: 'leave-video-room',
  VideoAnswer: 'video-answer',
  VideoIceCandidate: 'video-ice-candidate',
  VideoMediaToggle: 'video-media-toggle',
  VideoOffer: 'video-offer',
  VideoParticipantsChange: 'video-participants-change',
  VideoRoomError: 'video-room-error',
  VideoRoomJoined: 'video-room-joined',
  VideoUserJoined: 'video-user-joined',
  VideoUserLeft: 'video-user-left'
} as const;

export const VideoRoomEventSchema = z.enum([
  VideoRoomSocketEvent.JoinVideoRoom,
  VideoRoomSocketEvent.LeaveVideoRoom,
  VideoRoomSocketEvent.VideoAnswer,
  VideoRoomSocketEvent.VideoIceCandidate,
  VideoRoomSocketEvent.VideoMediaToggle,
  VideoRoomSocketEvent.VideoOffer,
  VideoRoomSocketEvent.VideoParticipantsChange,
  VideoRoomSocketEvent.VideoRoomError,
  VideoRoomSocketEvent.VideoRoomJoined,
  VideoRoomSocketEvent.VideoUserJoined,
  VideoRoomSocketEvent.VideoUserLeft
]);

export const VideoRoomIdInputSchema = z.object({
  interviewId: z.string().min(1)
});

export const VideoParticipantSchema = z.object({
  audioEnabled: z.boolean(),
  joinedAt: z.string(),
  name: z.string().min(1),
  role: InterviewParticipantRoleSchema,
  socketId: z.string().min(1),
  userId: z.string().min(1),
  videoEnabled: z.boolean()
});

export const RtcSessionDescriptionSchema = z.object({
  sdp: z.string().optional(),
  type: z.enum(['answer', 'offer', 'pranswer', 'rollback'])
});

export const RtcIceCandidateSchema = z.object({
  candidate: z.string(),
  sdpMid: z.string().nullable().optional(),
  sdpMLineIndex: z.number().int().nullable().optional(),
  usernameFragment: z.string().nullable().optional()
});

export const VideoRoomErrorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'ROOM_FULL',
  'INVALID_SIGNAL',
  'SIGNAL_TARGET_NOT_FOUND'
]);

export const JoinVideoRoomPayloadSchema = VideoRoomIdInputSchema;

export const LeaveVideoRoomPayloadSchema = VideoRoomIdInputSchema;

export const VideoRoomJoinedPayloadSchema = VideoRoomIdInputSchema.extend({
  participant: VideoParticipantSchema,
  participants: z.array(VideoParticipantSchema),
  roomId: z.string().min(1)
});

export const VideoParticipantsChangePayloadSchema = VideoRoomIdInputSchema.extend({
  participants: z.array(VideoParticipantSchema)
});

export const VideoUserJoinedPayloadSchema = VideoRoomIdInputSchema.extend({
  participant: VideoParticipantSchema
});

export const VideoUserLeftPayloadSchema = VideoRoomIdInputSchema.extend({
  socketId: z.string().min(1),
  userId: z.string().min(1)
});

export const VideoOfferPayloadSchema = VideoRoomIdInputSchema.extend({
  offer: RtcSessionDescriptionSchema,
  targetSocketId: z.string().min(1)
});

export const BroadcastVideoOfferPayloadSchema = VideoRoomIdInputSchema.extend({
  fromSocketId: z.string().min(1),
  offer: RtcSessionDescriptionSchema
});

export const VideoAnswerPayloadSchema = VideoRoomIdInputSchema.extend({
  answer: RtcSessionDescriptionSchema,
  targetSocketId: z.string().min(1)
});

export const BroadcastVideoAnswerPayloadSchema = VideoRoomIdInputSchema.extend({
  answer: RtcSessionDescriptionSchema,
  fromSocketId: z.string().min(1)
});

export const VideoIceCandidatePayloadSchema = VideoRoomIdInputSchema.extend({
  candidate: RtcIceCandidateSchema,
  targetSocketId: z.string().min(1)
});

export const BroadcastVideoIceCandidatePayloadSchema = VideoRoomIdInputSchema.extend({
  candidate: RtcIceCandidateSchema,
  fromSocketId: z.string().min(1)
});

export const VideoMediaTogglePayloadSchema = VideoRoomIdInputSchema.extend({
  enabled: z.boolean(),
  kind: z.enum(['audio', 'video'])
});

export const BroadcastVideoMediaTogglePayloadSchema = VideoMediaTogglePayloadSchema.extend({
  fromSocketId: z.string().min(1)
});

export const VideoRoomErrorPayloadSchema = z.object({
  code: VideoRoomErrorCodeSchema,
  message: z.string().min(1)
});

export type VideoRoomEvent = z.infer<typeof VideoRoomEventSchema>;
export type VideoRoomIdInput = z.infer<typeof VideoRoomIdInputSchema>;
export type VideoParticipant = z.infer<typeof VideoParticipantSchema>;
export type RtcSessionDescription = z.infer<typeof RtcSessionDescriptionSchema>;
export type RtcIceCandidate = z.infer<typeof RtcIceCandidateSchema>;
export type VideoRoomErrorCode = z.infer<typeof VideoRoomErrorCodeSchema>;
export type JoinVideoRoomPayload = z.infer<typeof JoinVideoRoomPayloadSchema>;
export type LeaveVideoRoomPayload = z.infer<typeof LeaveVideoRoomPayloadSchema>;
export type VideoRoomJoinedPayload = z.infer<typeof VideoRoomJoinedPayloadSchema>;
export type VideoParticipantsChangePayload = z.infer<typeof VideoParticipantsChangePayloadSchema>;
export type VideoUserJoinedPayload = z.infer<typeof VideoUserJoinedPayloadSchema>;
export type VideoUserLeftPayload = z.infer<typeof VideoUserLeftPayloadSchema>;
export type VideoOfferPayload = z.infer<typeof VideoOfferPayloadSchema>;
export type BroadcastVideoOfferPayload = z.infer<typeof BroadcastVideoOfferPayloadSchema>;
export type VideoAnswerPayload = z.infer<typeof VideoAnswerPayloadSchema>;
export type BroadcastVideoAnswerPayload = z.infer<typeof BroadcastVideoAnswerPayloadSchema>;
export type VideoIceCandidatePayload = z.infer<typeof VideoIceCandidatePayloadSchema>;
export type BroadcastVideoIceCandidatePayload = z.infer<typeof BroadcastVideoIceCandidatePayloadSchema>;
export type VideoMediaTogglePayload = z.infer<typeof VideoMediaTogglePayloadSchema>;
export type BroadcastVideoMediaTogglePayload = z.infer<typeof BroadcastVideoMediaTogglePayloadSchema>;
export type VideoRoomErrorPayload = z.infer<typeof VideoRoomErrorPayloadSchema>;

export type VideoRoomClientToServerEvents = {
  [VideoRoomSocketEvent.JoinVideoRoom]: (payload: JoinVideoRoomPayload) => void;
  [VideoRoomSocketEvent.LeaveVideoRoom]: (payload: LeaveVideoRoomPayload) => void;
  [VideoRoomSocketEvent.VideoAnswer]: (payload: VideoAnswerPayload) => void;
  [VideoRoomSocketEvent.VideoIceCandidate]: (payload: VideoIceCandidatePayload) => void;
  [VideoRoomSocketEvent.VideoMediaToggle]: (payload: VideoMediaTogglePayload) => void;
  [VideoRoomSocketEvent.VideoOffer]: (payload: VideoOfferPayload) => void;
};

export type VideoRoomServerToClientEvents = {
  [VideoRoomSocketEvent.VideoAnswer]: (payload: BroadcastVideoAnswerPayload) => void;
  [VideoRoomSocketEvent.VideoIceCandidate]: (payload: BroadcastVideoIceCandidatePayload) => void;
  [VideoRoomSocketEvent.VideoMediaToggle]: (payload: BroadcastVideoMediaTogglePayload) => void;
  [VideoRoomSocketEvent.VideoOffer]: (payload: BroadcastVideoOfferPayload) => void;
  [VideoRoomSocketEvent.VideoParticipantsChange]: (payload: VideoParticipantsChangePayload) => void;
  [VideoRoomSocketEvent.VideoRoomError]: (payload: VideoRoomErrorPayload) => void;
  [VideoRoomSocketEvent.VideoRoomJoined]: (payload: VideoRoomJoinedPayload) => void;
  [VideoRoomSocketEvent.VideoUserJoined]: (payload: VideoUserJoinedPayload) => void;
  [VideoRoomSocketEvent.VideoUserLeft]: (payload: VideoUserLeftPayload) => void;
};

export function createVideoRoomId(input: VideoRoomIdInput): string {
  const { interviewId } = VideoRoomIdInputSchema.parse(input);

  return `interview:${interviewId}:video`;
}

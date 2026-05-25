import { z } from 'zod';
import { CodeEditorLanguageSchema } from './interviews';

export const CodeRoomSocketEvent = {
  AwarenessUpdate: 'awareness-update',
  CodeRoomError: 'code-room-error',
  Connect: 'connect',
  ConnectError: 'connect_error',
  Connection: 'connection',
  Disconnect: 'disconnect',
  JoinCodeRoom: 'join-code-room',
  LanguageChange: 'language-change',
  ParticipantsChange: 'participants-change',
  Reconnect: 'reconnect',
  ReconnectAttempt: 'reconnect_attempt',
  ReconnectFailed: 'reconnect_failed',
  YjsSync: 'yjs-sync',
  YjsUpdate: 'yjs-update'
} as const;

export const CodeRoomEventSchema = z.enum([
  CodeRoomSocketEvent.JoinCodeRoom,
  CodeRoomSocketEvent.LanguageChange,
  CodeRoomSocketEvent.YjsSync,
  CodeRoomSocketEvent.YjsUpdate,
  CodeRoomSocketEvent.AwarenessUpdate,
  CodeRoomSocketEvent.ParticipantsChange,
  CodeRoomSocketEvent.CodeRoomError
]);

export const CodeRoomIdInputSchema = z.object({
  interviewId: z.string().min(1),
  questionId: z.string().min(1)
});

export const InterviewParticipantRoleSchema = z.enum(['candidate', 'interviewer']);

export const CodeRoomAccessSchema = z.object({
  canEdit: z.boolean(),
  role: InterviewParticipantRoleSchema
});

export const CodeRoomParticipantSchema = z.object({
  socketId: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  role: InterviewParticipantRoleSchema,
  joinedAt: z.string()
});

export const CodeRoomErrorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'INVALID_UPDATE',
  'PERSISTENCE_FAILED'
]);

export const JoinCodeRoomPayloadSchema = CodeRoomIdInputSchema;

export const LanguageChangePayloadSchema = CodeRoomIdInputSchema.extend({
  language: CodeEditorLanguageSchema
});

export const BinaryUpdateSchema = z.union([
  z.instanceof(Uint8Array),
  z.instanceof(ArrayBuffer),
  z.array(z.number().int().min(0).max(255))
]).transform((value) => {
  if (value instanceof Uint8Array) {
    return value;
  }

  return new Uint8Array(value);
});

export const YjsUpdatePayloadSchema = CodeRoomIdInputSchema.extend({
  update: BinaryUpdateSchema
});

export const YjsSyncPayloadSchema = YjsUpdatePayloadSchema.extend({
  access: CodeRoomAccessSchema,
  language: CodeEditorLanguageSchema
});

export const BroadcastLanguageChangePayloadSchema = LanguageChangePayloadSchema.extend({
  updatedBy: z.string().min(1)
});

export const BroadcastYjsUpdatePayloadSchema = YjsUpdatePayloadSchema.extend({
  updatedBy: z.string().min(1)
});

export const AwarenessUpdatePayloadSchema = YjsUpdatePayloadSchema;

export const BroadcastAwarenessUpdatePayloadSchema = YjsUpdatePayloadSchema.extend({
  updatedBy: z.string().min(1)
});

export const ParticipantsChangePayloadSchema = CodeRoomIdInputSchema.extend({
  participants: z.array(CodeRoomParticipantSchema)
});

export const CodeRoomErrorPayloadSchema = z.object({
  code: CodeRoomErrorCodeSchema,
  message: z.string().min(1)
});

export type CodeRoomEvent = z.infer<typeof CodeRoomEventSchema>;
export type CodeRoomAccess = z.infer<typeof CodeRoomAccessSchema>;
export type CodeRoomIdInput = z.infer<typeof CodeRoomIdInputSchema>;
export type InterviewParticipantRole = z.infer<typeof InterviewParticipantRoleSchema>;
export type CodeRoomParticipant = z.infer<typeof CodeRoomParticipantSchema>;
export type CodeRoomErrorCode = z.infer<typeof CodeRoomErrorCodeSchema>;
export type JoinCodeRoomPayload = z.infer<typeof JoinCodeRoomPayloadSchema>;
export type LanguageChangePayload = z.infer<typeof LanguageChangePayloadSchema>;
export type YjsUpdatePayload = z.infer<typeof YjsUpdatePayloadSchema>;
export type YjsSyncPayload = z.infer<typeof YjsSyncPayloadSchema>;
export type BroadcastLanguageChangePayload = z.infer<typeof BroadcastLanguageChangePayloadSchema>;
export type BroadcastYjsUpdatePayload = z.infer<typeof BroadcastYjsUpdatePayloadSchema>;
export type AwarenessUpdatePayload = z.infer<typeof AwarenessUpdatePayloadSchema>;
export type BroadcastAwarenessUpdatePayload = z.infer<typeof BroadcastAwarenessUpdatePayloadSchema>;
export type ParticipantsChangePayload = z.infer<typeof ParticipantsChangePayloadSchema>;
export type CodeRoomErrorPayload = z.infer<typeof CodeRoomErrorPayloadSchema>;

export type CodeRoomClientToServerEvents = {
  [CodeRoomSocketEvent.JoinCodeRoom]: (payload: JoinCodeRoomPayload) => void;
  [CodeRoomSocketEvent.LanguageChange]: (payload: LanguageChangePayload) => void;
  [CodeRoomSocketEvent.YjsUpdate]: (payload: YjsUpdatePayload) => void;
  [CodeRoomSocketEvent.AwarenessUpdate]: (payload: AwarenessUpdatePayload) => void;
};

export type CodeRoomServerToClientEvents = {
  [CodeRoomSocketEvent.LanguageChange]: (payload: BroadcastLanguageChangePayload) => void;
  [CodeRoomSocketEvent.YjsSync]: (payload: YjsSyncPayload) => void;
  [CodeRoomSocketEvent.YjsUpdate]: (payload: BroadcastYjsUpdatePayload) => void;
  [CodeRoomSocketEvent.AwarenessUpdate]: (payload: BroadcastAwarenessUpdatePayload) => void;
  [CodeRoomSocketEvent.ParticipantsChange]: (payload: ParticipantsChangePayload) => void;
  [CodeRoomSocketEvent.CodeRoomError]: (payload: CodeRoomErrorPayload) => void;
};

export function createCodeRoomId(input: CodeRoomIdInput): string {
  const { interviewId, questionId } = CodeRoomIdInputSchema.parse(input);

  return `interview:${interviewId}:question:${questionId}`;
}

import { z } from 'zod';
import { CodeEditorLanguageSchema } from './interviews';

export const CodeRoomSocketEvent = {
  AwarenessUpdate: 'awareness-update',
  CodeRoomError: 'code-room-error',
  Connection: 'connection',
  Disconnect: 'disconnect',
  JoinCodeRoom: 'join-code-room',
  ParticipantsChange: 'participants-change',
  YjsSync: 'yjs-sync',
  YjsUpdate: 'yjs-update'
} as const;

export const CodeRoomEventSchema = z.enum([
  CodeRoomSocketEvent.JoinCodeRoom,
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

export const CodeRoomParticipantSchema = z.object({
  socketId: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
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

export const YjsUpdatePayloadSchema = CodeRoomIdInputSchema.extend({
  update: z.instanceof(Uint8Array)
});

export const YjsSyncPayloadSchema = YjsUpdatePayloadSchema.extend({
  language: CodeEditorLanguageSchema
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
export type CodeRoomIdInput = z.infer<typeof CodeRoomIdInputSchema>;
export type CodeRoomParticipant = z.infer<typeof CodeRoomParticipantSchema>;
export type CodeRoomErrorCode = z.infer<typeof CodeRoomErrorCodeSchema>;
export type JoinCodeRoomPayload = z.infer<typeof JoinCodeRoomPayloadSchema>;
export type YjsUpdatePayload = z.infer<typeof YjsUpdatePayloadSchema>;
export type YjsSyncPayload = z.infer<typeof YjsSyncPayloadSchema>;
export type BroadcastYjsUpdatePayload = z.infer<typeof BroadcastYjsUpdatePayloadSchema>;
export type AwarenessUpdatePayload = z.infer<typeof AwarenessUpdatePayloadSchema>;
export type BroadcastAwarenessUpdatePayload = z.infer<typeof BroadcastAwarenessUpdatePayloadSchema>;
export type ParticipantsChangePayload = z.infer<typeof ParticipantsChangePayloadSchema>;
export type CodeRoomErrorPayload = z.infer<typeof CodeRoomErrorPayloadSchema>;

export type CodeRoomClientToServerEvents = {
  [CodeRoomSocketEvent.JoinCodeRoom]: (payload: JoinCodeRoomPayload) => void;
  [CodeRoomSocketEvent.YjsUpdate]: (payload: YjsUpdatePayload) => void;
  [CodeRoomSocketEvent.AwarenessUpdate]: (payload: AwarenessUpdatePayload) => void;
};

export type CodeRoomServerToClientEvents = {
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

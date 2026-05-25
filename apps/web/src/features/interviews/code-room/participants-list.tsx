import type { CodeRoomParticipant } from './types';

type ParticipantsListProps = {
  participants: CodeRoomParticipant[];
};

export function ParticipantsList({ participants }: ParticipantsListProps): React.ReactElement {
  if (participants.length === 0) {
    return <p className="text-sm text-stone-500">No active collaborators</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {participants.map((participant) => (
        <li
          className="rounded-full border border-stone-200 px-3 py-1 text-sm font-semibold text-stone-700"
          key={participant.socketId}
        >
          {participant.name}
        </li>
      ))}
    </ul>
  );
}

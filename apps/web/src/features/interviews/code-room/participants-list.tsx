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
          <span className="ml-2 text-xs uppercase text-stone-500">{participantRoleLabel(participant.role)}</span>
        </li>
      ))}
    </ul>
  );
}

function participantRoleLabel(role: CodeRoomParticipant['role']): string {
  return role === 'interviewer' ? 'Interviewer' : 'Candidate';
}

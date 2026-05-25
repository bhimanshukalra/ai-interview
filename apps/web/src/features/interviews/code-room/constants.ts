import type { CodeEditorLanguage } from '@ai-interview/shared';

export const DEFAULT_CODE_LANGUAGE: CodeEditorLanguage = 'typescript';

export const CODE_EDITOR_LANGUAGE_OPTIONS: Array<{ label: string; value: CodeEditorLanguage }> = [
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Python', value: 'python' },
  { label: 'SQL', value: 'sql' },
];

export const STARTER_CODE_BY_LANGUAGE: Record<CodeEditorLanguage, string> = {
  typescript: `type Candidate = {
  name: string;
  score: number;
};

function rankCandidates(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort((left, right) => right.score - left.score);
}
`,
  javascript: `function rankCandidates(candidates) {
  return [...candidates].sort((left, right) => right.score - left.score);
}
`,
  python: `def rank_candidates(candidates):
    return sorted(candidates, key=lambda candidate: candidate["score"], reverse=True)
`,
  sql: `select
  candidate_id,
  avg(score) as average_score
from interview_scores
group by candidate_id
order by average_score desc;
`,
};

export const CODE_ROOM_COLORS = {
  localCollaborator: '#0f766e',
} as const;

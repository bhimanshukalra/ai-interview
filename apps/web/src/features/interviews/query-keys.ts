export const interviewQueryKeys = {
  create: ['interviews', 'create'] as const,
  list: ['interviews', 'list'] as const,
  session: (id: string) => ['interviews', 'session', id] as const,
  answers: (id: string) => ['interviews', 'answers', id] as const,
  submitAnswer: ['interviews', 'submit-answer'] as const,
  evaluate: ['interviews', 'evaluate'] as const,
  report: (id: string) => ['interviews', 'report', id] as const
};

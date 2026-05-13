export const interviewQueryKeys = {
  create: ['interviews', 'create'] as const,
  session: (id: string) => ['interviews', 'session', id] as const,
  answers: (id: string) => ['interviews', 'answers', id] as const,
  submitAnswer: ['interviews', 'submit-answer'] as const
};

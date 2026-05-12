export const interviewQueryKeys = {
  create: ['interviews', 'create'] as const,
  session: (id: string) => ['interviews', 'session', id] as const
};

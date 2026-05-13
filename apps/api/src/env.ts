export type Env = {
  Bindings: {
    DATABASE_URL: string;
    AI_PROVIDER?: "mock" | "gemini";
    AI_API_KEY?: string;
    AI_MODEL?: string;
    JWT_SECRET?: string;
  };
  Variables: {
    userId: string;
  };
};

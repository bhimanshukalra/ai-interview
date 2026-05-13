export type Env = {
  Bindings: {
    DATABASE_URL: string;
    AI_PROVIDER?: "mock" | "gemini";
    AI_API_KEY?: string;
    AI_MODEL?: string;
    AI_FALLBACK_TO_MOCK?: string;
    JWT_SECRET?: string;
    CORS_ORIGIN?: string;
  };
  Variables: {
    userId: string;
  };
};

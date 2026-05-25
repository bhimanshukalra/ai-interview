export type RealtimeConfig = {
  allowedOrigin: string;
  databaseUrl?: string;
  jwtSecret?: string;
  port: number;
};

function readPort(value: string | undefined): number {
  if (!value) {
    return 8788;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : 8788;
}

export function getRealtimeConfig(): RealtimeConfig {
  return {
    allowedOrigin: process.env.REALTIME_CORS_ORIGIN ?? process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    port: readPort(process.env.REALTIME_PORT),
  };
}

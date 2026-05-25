type LogContext = Record<string, unknown>;

export function logRealtimeInfo(message: string, context: LogContext = {}): void {
  console.warn(formatLogMessage(message, context));
}

export function logRealtimeWarning(message: string, context: LogContext = {}): void {
  console.warn(formatLogMessage(message, context));
}

export function logRealtimeError(message: string, context: LogContext = {}): void {
  console.error(formatLogMessage(message, context));
}

function formatLogMessage(message: string, context: LogContext): string {
  const contextEntries = Object.entries(context);

  if (contextEntries.length === 0) {
    return `[realtime] ${message}`;
  }

  return `[realtime] ${message} ${JSON.stringify(context)}`;
}

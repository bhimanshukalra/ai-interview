export function logWarning(message: string, error: unknown): void {
  console.warn(message, error);
}

export function logError(message: string, error: unknown): void {
  console.error(message, error);
}

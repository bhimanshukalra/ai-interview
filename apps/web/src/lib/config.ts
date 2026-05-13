const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

export function getApiBaseUrl() {
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }

  return apiBaseUrl;
}

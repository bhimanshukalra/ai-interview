const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
const authToken = process.env.NEXT_PUBLIC_AUTH_TOKEN;

export function getApiBaseUrl() {
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }

  return apiBaseUrl;
}

export function getAuthToken() {
  return authToken;
}

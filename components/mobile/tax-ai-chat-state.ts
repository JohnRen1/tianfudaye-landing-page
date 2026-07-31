export const CHAT_STATE_STORAGE_KEY_PREFIX = "tax-ai-chat-state-v1:";

const AUTHENTICATED_SESSION_STORAGE_KEY = `${CHAT_STATE_STORAGE_KEY_PREFIX}authenticated-session`;

export function getChatStateStorageKey(token: string | null): string {
  if (!token) return AUTHENTICATED_SESSION_STORAGE_KEY;

  try {
    const decodedToken = atob(token);
    const separatorIndex = decodedToken.lastIndexOf(":");
    const userId = decodedToken.slice(0, separatorIndex);
    if (separatorIndex > 0 && userId.length >= 10) {
      return `${CHAT_STATE_STORAGE_KEY_PREFIX}user:${userId}`;
    }
  } catch {
    // Unknown token formats still get a working per-session cache.
  }

  return AUTHENTICATED_SESSION_STORAGE_KEY;
}

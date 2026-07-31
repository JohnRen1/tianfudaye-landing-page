import { describe, expect, it } from "vitest";
import { getChatStateStorageKey } from "@/components/mobile/tax-ai-chat-state";

function buildToken(userId: string, issuedAt: number): string {
  return Buffer.from(`${userId}:${issuedAt}`).toString("base64");
}

describe("AI 客服助手对话缓存", () => {
  it("同一用户刷新 token 后仍使用同一个缓存键", () => {
    const userId = "0ade85fc-7c12-4568-b1c9-31f773df9d92";

    expect(getChatStateStorageKey(buildToken(userId, 1000))).toBe(
      getChatStateStorageKey(buildToken(userId, 2000)),
    );
  });

  it("不同用户使用不同缓存键", () => {
    expect(getChatStateStorageKey(buildToken("user-0000000001", 1000))).not.toBe(
      getChatStateStorageKey(buildToken("user-0000000002", 1000)),
    );
  });
});

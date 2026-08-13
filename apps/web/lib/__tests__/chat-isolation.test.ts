// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";

const saveChat = (userName: string, messages: unknown[], complete: boolean) => {
  localStorage.setItem(`gp_chat_messages_${userName}`, JSON.stringify(messages));
  localStorage.setItem(`gp_chat_complete_${userName}`, String(complete));
  localStorage.setItem(`gp_chat_version_${userName}`, "v2");
};

const loadChat = (userName: string) => {
  const raw = localStorage.getItem(`gp_chat_messages_${userName}`);
  const complete = localStorage.getItem(`gp_chat_complete_${userName}`) === "true";
  return {
    messages: raw ? JSON.parse(raw) : null,
    complete,
  };
};

const hasChat = (userName: string) => {
  return localStorage.getItem(`gp_chat_messages_${userName}`) !== null;
};

describe("ChatPreference per-user isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores messages under per-user key", () => {
    saveChat("老张", [{ role: "user", content: "只吃饭" }], false);
    expect(hasChat("老张")).toBe(true);
    expect(hasChat("阿花")).toBe(false);
  });

  it("isolates messages between two users", () => {
    saveChat("老张", [{ role: "assistant", content: "老张的对话" }], true);
    saveChat("阿花", [{ role: "assistant", content: "阿花的对话" }], false);

    expect(loadChat("老张").messages[0].content).toBe("老张的对话");
    expect(loadChat("老张").complete).toBe(true);
    expect(loadChat("阿花").messages[0].content).toBe("阿花的对话");
    expect(loadChat("阿花").complete).toBe(false);
  });

  it("returns null messages for user with no saved chat", () => {
    saveChat("老张", [{ role: "user", content: "hi" }], false);
    const result = loadChat("新来的");
    expect(result.messages).toBeNull();
    expect(result.complete).toBe(false);
  });

  it("switching to new user gives clean slate, not old user state", () => {
    saveChat("老张", [{ role: "assistant", content: "老张的完成对话" }], true);

    const huaState = loadChat("阿花");
    expect(huaState.messages).toBeNull();
    expect(huaState.complete).toBe(false);
  });
});

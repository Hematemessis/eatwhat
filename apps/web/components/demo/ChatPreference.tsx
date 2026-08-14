"use client";
import { useState, useEffect, useRef } from "react";
import { SectionLabel } from "./ui";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center", verticalAlign: "middle", marginLeft: 4 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--muted)", display: "inline-block", animation: `typewave 1.2s ease-in-out ${i * 0.18}s infinite` }} />
      ))}
    </span>
  );
}

/** Parse a text line like "A. 只吃饭，找家靠谱的店" into {key, label} or null */
interface QuickOption {
  key: string;
  label: string;
}

function parseQuickOptions(text: string): { body: string; options: QuickOption[] } | null {
  const lines = text.split("\n");
  const options: QuickOption[] = [];
  let firstOptionIdx = -1;
  let pattern: "letter" | "number" | "dash" | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    let match: RegExpMatchArray | null = null;

    // Try letter-style: "A. 选项" or "A、选项"
    match = line.match(/^([A-F])[.、]\s+(.+)$/);
    if (match) {
      if (!pattern) pattern = "letter";
      if (pattern === "letter") {
        options.push({ key: match[1]!, label: match[2]! });
        if (firstOptionIdx < 0) firstOptionIdx = i;
      }
      continue;
    }

    // Try numbered: "1. 选项" "1、选项" "1️⃣ 选项"
    match = line.match(/^(\d+)[.、️⃣]\s*(.+)$/);
    if (match) {
      if (!pattern) pattern = "number";
      if (pattern === "number") {
        options.push({ key: match[1]!, label: match[2]! });
        if (firstOptionIdx < 0) firstOptionIdx = i;
      }
      continue;
    }

    // Try dash/bullet: "- 选项" "• 选项" "· 选项" "* 选项"
    match = line.match(/^[-•·\*]\s+(.+)$/);
    if (match) {
      if (!pattern) pattern = "dash";
      if (pattern === "dash") {
        options.push({ key: "", label: match[1]! });
        if (firstOptionIdx < 0) firstOptionIdx = i;
      }
      continue;
    }
  }

  // Need at least 2 options, and they should be at the end of the message
  if (options.length < 2) return null;
  if (firstOptionIdx < 0) return null;

  // Assign keys for dash-style options (A, B, C...)
  if (pattern === "dash") {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    options.forEach((opt, i) => { opt.key = letters[i] || String(i + 1); });
  }

  // Body is everything before the first option line
  const body = lines
    .slice(0, firstOptionIdx)
    .filter(l => l.trim())
    .join("\n");

  return { body: body || "", options };
}

type EventType = "meal_only" | "activity_only" | "meal_activity" | "undecided";

function buildWelcome(userName: string, eventType: EventType = "undecided", eventLocation = "当前区域") {
  const greeting = userName ? `嘿 ${userName}！` : "哟！";
  const context = eventLocation ? `地点是 ${eventLocation}。` : "";

  if (eventType === "meal_only") {
    return `${greeting}聚会已经建好，海鸥参谋接班啦 🐦 ${context}\n\n接下来用 1–2 分钟确认你的口味、预算和忌口。先从最想吃的方向开始：\n\nA. 火锅 / 烧烤，热闹一点\nB. 粤菜 / 家常菜，稳妥好聊\nC. 日料 / 西餐，更看重氛围\nD. 没想法，交给海鸥帮我选`;
  }

  if (eventType === "activity_only") {
    return `${greeting}活动局已经建好，海鸥参谋接班啦 🐦 ${context}\n\n接下来确认大家怎么玩、预算多少、有没有体力或社交雷区。你更想从哪类开始？\n\nA. KTV / 桌游，轻松社交\nB. 密室 / 剧本杀，沉浸一点\nC. 户外 / 运动，动起来\nD. 没想法，交给海鸥帮我选`;
  }

  if (eventType === "meal_activity") {
    return `${greeting}吃饭加活动的一条龙聚会已经建好 🐦 ${context}\n\n接下来我会确认吃什么、玩什么和总预算。先选今晚的节奏：\n\nA. 先好好吃饭，再轻松聊天\nB. 吃饭简单点，把重点留给活动\nC. 两边都要有氛围，距离别太远\nD. 交给海鸥帮我搭配`;
  }

  return `${greeting}海鸥聚会参谋已就位 🐦 ${context}\n\n这次聚会还没定模式，我先帮你切一刀：\n\nA. 只吃饭，找家靠谱的店\nB. 只玩乐，KTV / 桌游 / 密室走起\nC. 吃饭 + 娱乐，一条龙安排\nD. 还没想好，交给海鸥参谋`;
}


export default function ChatPreference({
  currentUser,
  eventType = "undecided",
  eventLocation = "当前区域",
  inviteCode,
  isOwner = false,
  completedPreferences = 0,
  requiredPreferences = 2,
  onNavigate,
  onPreferencesCollected,
}: {
  currentUser: string;
  eventType?: EventType;
  eventLocation?: string;
  inviteCode?: string;
  isOwner?: boolean;
  completedPreferences?: number;
  requiredPreferences?: number;
  onNavigate?: (tab: string) => void;
  onPreferencesCollected: (name: string, prefs: any) => void;
}) {
  const userRoomKey = `gp_chat_room_${currentUser}`;
  const userMsgKey = `gp_chat_messages_${currentUser}`;
  const userCompleteKey = `gp_chat_complete_${currentUser}`;
  const userVersionKey = `gp_chat_version_${currentUser}`;

  const initialMsg = [{ role: "assistant" as const, content: buildWelcome(currentUser, eventType, eventLocation) }];

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined" && currentUser) {
      try {
        const savedVersion = localStorage.getItem(userVersionKey);
        if (savedVersion === "v3") {
          const saved = localStorage.getItem(userMsgKey);
          if (saved) return JSON.parse(saved);
        }
      } catch {}
    }
    if (currentUser) localStorage.setItem(userVersionKey, "v3");
    return initialMsg;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(() => {
    if (typeof window !== "undefined" && currentUser) return localStorage.getItem(userCompleteKey) === "true";
    return false;
  });
  const [clickedOptions, setClickedOptions] = useState<Record<number, boolean>>({});
  const [inviteCopied, setInviteCopied] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const roomId = useRef(
    typeof window !== "undefined" && currentUser
      ? localStorage.getItem(userRoomKey) || crypto.randomUUID()
      : "server"
  );

  useEffect(() => {
    if (currentUser) localStorage.setItem(userRoomKey, roomId.current);
  }, [currentUser, userRoomKey]);

  useEffect(() => {
    if (currentUser) localStorage.setItem(userMsgKey, JSON.stringify(messages));
    const messageList = messagesRef.current;
    if (messageList) {
      messageList.scrollTo({ top: messageList.scrollHeight, behavior: "smooth" });
    }
  }, [messages, currentUser, userMsgKey]);

  useEffect(() => {
    if (currentUser) localStorage.setItem(userCompleteKey, String(complete));
  }, [complete, currentUser, userCompleteKey]);

  // Reset clicked options when a new assistant message arrives
  useEffect(() => {
    setClickedOptions({});
  }, [messages.length]);

  // Reload chat state when currentUser switches
  useEffect(() => {
    if (!currentUser) {
      setMessages([{ role: "assistant", content: buildWelcome("", eventType, eventLocation) }]);
      setComplete(false);
      return;
    }
    const msgKey = `gp_chat_messages_${currentUser}`;
    const verKey = `gp_chat_version_${currentUser}`;
    const compKey = `gp_chat_complete_${currentUser}`;
    const roomKey = `gp_chat_room_${currentUser}`;

    try {
      const savedVersion = localStorage.getItem(verKey);
      if (savedVersion === "v3") {
        const saved = localStorage.getItem(msgKey);
        if (saved) {
          setMessages(JSON.parse(saved));
          setComplete(localStorage.getItem(compKey) === "true");
        } else {
          setMessages([{ role: "assistant", content: buildWelcome(currentUser, eventType, eventLocation) }]);
          setComplete(false);
        }
      } else {
        setMessages([{ role: "assistant", content: buildWelcome(currentUser, eventType, eventLocation) }]);
        setComplete(false);
      }
    } catch {
      setMessages([{ role: "assistant", content: buildWelcome(currentUser, eventType, eventLocation) }]);
      setComplete(false);
    }

    const existingRoom = localStorage.getItem(roomKey);
    roomId.current = existingRoom || crypto.randomUUID();
    if (!existingRoom) localStorage.setItem(roomKey, roomId.current);
    localStorage.setItem(verKey, "v3");
  }, [currentUser, eventType, eventLocation]);

  const quickReply = (label: string) => {
    if (loading || complete || !currentUser) return;
    const text = label;
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    fetch("/api/chat/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        roomId: roomId.current,
        userName: currentUser,
        eventMode: eventType,
        eventLocation,
        conversationHistory: messages,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "请求失败");
        }
        return res.json();
      })
      .then((data) => {
        const aiMsg: ChatMessage = { role: "assistant", content: data.reply };
        setMessages(prev => [...prev, aiMsg]);
        if (data.complete && data.preferences) {
          setComplete(true);
          onPreferencesCollected(currentUser, data.preferences);
        }
      })
      .catch(() => {
        setMessages(prev => [...prev, { role: "assistant", content: "哎呀，海鸥翅膀卡住了…等一下再试试？🐦" }]);
      })
      .finally(() => setLoading(false));
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || complete) return;
    setInput("");
    quickReply(text);
  };

  const reset = () => {
    const welcome = buildWelcome(currentUser, eventType, eventLocation);
    setMessages([{ role: "assistant", content: welcome }]);
    setComplete(false);
    setClickedOptions({});
    if (currentUser) {
      localStorage.removeItem(userMsgKey);
      localStorage.removeItem(userCompleteKey);
      roomId.current = crypto.randomUUID();
      localStorage.setItem(userRoomKey, roomId.current);
    }
  };

  /** Render a single message bubble, with quick-reply buttons for assistant messages */
  function MessageBubble({ msg, idx }: { msg: ChatMessage; idx: number }) {
    const isUser = msg.role === "user";
    const isLastAssistant = msg.role === "assistant" && idx === messages.length - 1;

    let body = msg.content;
    let options: QuickOption[] | null = null;

    // Only parse quick options on the LAST assistant message when not loading
    if (isLastAssistant && !loading && !complete) {
      const parsed = parseQuickOptions(msg.content);
      if (parsed && parsed.options.length >= 2) {
        body = parsed.body;
        options = parsed.options;
      }
    }

    return (
      <div
        style={{
          display: "flex",
          gap: 10,
          alignSelf: isUser ? "flex-end" : "flex-start",
          flexDirection: isUser ? "row-reverse" : "row",
          maxWidth: "88%",
          animation: `fu .35s var(--sp) both`,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: isUser ? "var(--text)" : "oklch(93% .04 228)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isUser ? 10 : 14,
            fontWeight: 600,
            color: isUser ? "var(--bg)" : "var(--text)",
          }}
        >
          {isUser ? "我" : "🐦"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Text bubble */}
          {body && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: isUser ? "var(--text)" : "var(--bg)",
                color: isUser ? "var(--bg)" : "var(--text)",
                fontSize: 13,
                lineHeight: 1.6,
                fontFamily: "var(--fb)",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              {body}
            </div>
          )}

          {/* Quick-reply option buttons */}
          {options && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingLeft: 2 }}>
              {options.map((opt) => {
                const clicked = clickedOptions[idx] ?? false;
                return (
                  <button
                    key={opt.key}
                    onClick={() => {
                      if (clicked || loading) return;
                      setClickedOptions(prev => ({ ...prev, [idx]: true }));
                      quickReply(opt.label);
                    }}
                    disabled={clicked || loading}
                    title={opt.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 13px",
                      border: "1px solid var(--border2)",
                      borderRadius: 10,
                      background: clicked ? "var(--border2)" : "var(--surface)",
                      cursor: clicked || loading ? "default" : "pointer",
                      fontSize: 12,
                      fontFamily: "var(--fb)",
                      color: "var(--text)",
                      textAlign: "left",
                      transition: "all .18s var(--eo)",
                      opacity: clicked ? 0.45 : 1,
                    }}
                    onMouseEnter={e => {
                      if (!clicked && !loading) {
                        e.currentTarget.style.background = "var(--bg)";
                        e.currentTarget.style.borderColor = "var(--border)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!clicked && !loading) {
                        e.currentTarget.style.background = "var(--surface)";
                        e.currentTarget.style.borderColor = "var(--border2)";
                      }
                    }}
                  >
                    <span style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: "var(--text)",
                      color: "var(--bg)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {opt.key}
                    </span>
                    <span style={{ lineHeight: 1.35 }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const decisionReady = completedPreferences >= requiredPreferences;
  const journeyStep = !complete ? 1 : decisionReady ? 3 : 2;
  const copyInviteCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard?.writeText(inviteCode).catch(() => {});
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 1600);
  };

  return (
    <div>
      <div style={{ padding: "40px 32px 24px", borderBottom: "1px solid var(--border2)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 32, top: 20, opacity: .05, pointerEvents: "none" }}>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <ellipse cx="60" cy="55" rx="30" ry="20" stroke="var(--text)" strokeWidth="1" />
            <path d="M30 70 Q60 90 90 70" stroke="var(--text)" strokeWidth="1" fill="none" />
            <circle cx="50" cy="52" r="2" fill="var(--text)" />
            <circle cx="70" cy="52" r="2" fill="var(--text)" />
            <path d="M55 60 Q60 64 65 60" stroke="var(--text)" strokeWidth="1" fill="none" />
            <path d="M15 45 L-5 30 M105 45 L125 30" stroke="var(--text)" strokeWidth="1" />
          </svg>
        </div>
        <SectionLabel style={{ marginBottom: 10 }}>AI 对话</SectionLabel>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 48, lineHeight: .98, letterSpacing: "-.04em", color: "var(--text)", textWrap: "balance" as React.CSSProperties["textWrap"] }}>
          海鸥参谋<br /><em>帮你定偏好</em>
        </h2>
        {currentUser && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>当前用户: <strong style={{ color: "var(--text)" }}>{currentUser}</strong></p>}
      </div>

      {currentUser && (
        <div data-testid="decision-journey-guide" style={{ padding: "18px 32px 0", maxWidth: 720 }}>
          <div style={{ border: "1px solid oklch(84% .07 228)", background: "linear-gradient(135deg, oklch(97% .025 228), var(--surface))", borderRadius: "var(--r)", padding: "16px 18px", boxShadow: "var(--sh)", animation: "fu .4s var(--sp) both" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginBottom: 16 }}>
              {[
                [1, "AI 确认需求"],
                [2, `至少 ${requiredPreferences} 人完成`],
                [3, "AI 综合推荐"],
              ].map(([index, label]) => {
                const stepIndex = Number(index);
                const active = journeyStep === stepIndex;
                const done = journeyStep > stepIndex;
                return (
                  <div key={stepIndex} style={{ minWidth: 0 }}>
                    <div style={{ height: 3, borderRadius: 99, background: done || active ? "var(--text)" : "var(--border2)", marginBottom: 7 }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 5, color: active ? "var(--text)" : "var(--muted)", fontSize: 10, fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>
                      <span>{done ? "✓" : stepIndex}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 300px" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  {!complete
                    ? "第 1 步：先让 AI 了解你"
                    : decisionReady
                      ? "偏好数量已达标，可以让 AI 拍板了"
                      : `你的偏好已完成，还差 ${Math.max(requiredPreferences - completedPreferences, 0)} 人`}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
                  {!complete
                    ? "点击下方选项即可回答，也可以在输入框里直接描述；海鸥会逐步确认口味、预算、忌口和氛围。"
                    : decisionReady
                      ? isOwner ? "进入 AI 推荐页，系统会比较所有人的硬约束与可妥协项。" : "你的部分已经完成，等待群主生成最终方案。"
                      : isOwner ? "把邀请码发给朋友；至少两人完成 AI 对话后，群体推荐才会解锁。" : "你的部分已经完成，等待其他成员交卷。"}
                </div>
              </div>

              {complete && isOwner && !decisionReady && inviteCode && (
                <button type="button" onClick={copyInviteCode} data-testid="journey-next-action" style={{ padding: "9px 13px", borderRadius: "var(--rs)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {inviteCopied ? "✓ 已复制邀请码" : `复制邀请码 ${inviteCode}`}
                </button>
              )}
              {complete && isOwner && decisionReady && (
                <button type="button" onClick={() => onNavigate?.("ai")} data-testid="journey-next-action" style={{ padding: "10px 16px", borderRadius: "var(--rs)", border: "none", background: "var(--text)", color: "var(--bg)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                  去生成 AI 方案 →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!currentUser && (
        <div style={{ padding: "48px 32px", maxWidth: 520, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐦</div>
          <h3 style={{ fontFamily: "var(--fd)", fontSize: 22, color: "var(--text)", marginBottom: 8 }}>请先选择一个用户</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, fontFamily: "var(--fb)" }}>
            在顶部&ldquo;模拟用户&rdquo;栏中点击已有用户切换身份，<br />或输入新名字添加一个模拟用户。
          </p>
        </div>
      )}

      {currentUser && (<>
      {complete && (
        <div style={{ padding: "12px 32px 0", maxWidth: 640 }}>
          <div style={{ padding: "12px 16px", borderRadius: "var(--r)", background: "oklch(95% .04 148)", border: "1px solid oklch(85% .08 148)", color: "oklch(34% .13 148)", fontSize: 12, fontWeight: 500, fontFamily: "var(--fb)", display: "flex", alignItems: "center", gap: 8, animation: "si .3s var(--sp) both" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            偏好已收集完成！
          </div>
          <button
            onClick={reset}
            style={{ marginTop: 8, fontSize: 10, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)" }}
          >
            重新对话
          </button>
        </div>
      )}

      <div style={{ padding: "24px 32px 0", maxWidth: 640 }}>
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--r)",
            border: "1px solid var(--border2)",
            boxShadow: "var(--sh)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: 460,
          }}
        >
          <div
            ref={messagesRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} idx={i} />
            ))}

            {loading && (
              <div style={{ display: "flex", gap: 10, alignSelf: "flex-start", animation: `fu .3s var(--sp) both` }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "oklch(93% .04 228)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  🐦
                </div>
                <div style={{ padding: "10px 14px", borderRadius: "14px 14px 14px 4px", background: "var(--bg)", color: "var(--text)", fontSize: 13, lineHeight: 1.6, fontFamily: "var(--fb)" }}>
                  海鸥正在思考<TypingDots />
                </div>
              </div>
            )}
          </div>

          {!complete && (
            <div style={{ borderTop: "1px solid var(--border2)", padding: "12px 14px", display: "flex", gap: 8, alignItems: "center" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="输入你的回答…"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: "var(--rs)",
                  border: "1px solid var(--border2)",
                  background: "var(--bg)",
                  fontSize: 13,
                  fontFamily: "var(--fb)",
                  color: "var(--text)",
                  outline: "none",
                  transition: "border-color .2s",
                  boxSizing: "border-box",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--border)")}
                onBlur={e => (e.target.style.borderColor = "var(--border2)")}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                style={{
                  padding: "9px 18px",
                  borderRadius: "var(--rs)",
                  border: "none",
                  background: input.trim() && !loading ? "var(--text)" : "var(--border2)",
                  color: "var(--bg)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  fontFamily: "var(--fb)",
                  transition: "all .2s",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { if (input.trim() && !loading) e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                发送
              </button>
            </div>
          )}
        </div>
      </div>

      <footer style={{ background: "var(--text)", marginTop: 48, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(var(--border2) 1px,transparent 1px),linear-gradient(90deg,var(--border2) 1px,transparent 1px)", backgroundSize: "40px 40px", opacity: .06, pointerEvents: "none" }} />
        <div style={{ position: "relative", padding: "52px 32px 32px", maxWidth: 820 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="3" fill="rgba(255,255,255,.9)" /><circle cx="9" cy="9" r="3" fill="rgba(255,255,255,.4)" /></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.02em", color: "white" }}>今天整点啥</span>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,.08)", marginBottom: 20 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>AI 对话偏好收集</div>
            <div style={{ display: "flex", gap: 16 }}>
              {["隐私", "条款", "GitHub", "文档"].map(l => (
                <span key={l} style={{ fontSize: 11, color: "rgba(255,255,255,.35)", cursor: "pointer" }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
      </>)}
    </div>
  );
}

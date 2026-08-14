"use client";
import { useState, useCallback, KeyboardEvent } from "react";
import { createDemoGroup, createGroup, joinGroup, loadGroup } from "@/lib/group-store";

type Step = "idle" | "create" | "join";

const EVENT_TYPES: { value: "meal_only" | "activity_only" | "meal_activity" | "undecided"; label: string }[] = [
  { value: "meal_only",    label: "纯吃饭" },
  { value: "activity_only", label: "纯活动" },
  { value: "meal_activity", label: "吃饭 + 活动" },
  { value: "undecided",    label: "还没想好" },
];

type NextTab = "overview" | "chat-preference";

export default function LoginModal({ onGroupReady, onClose }: { onGroupReady: (userName: string, isOwner: boolean, nextTab?: NextTab) => void; onClose?: () => void }) {
  const [step, setStep] = useState<Step>("idle");
  const [name, setName] = useState("");
  const [nameError, setnameError] = useState("");
  const [eventType, setEventType] = useState<"meal_only" | "activity_only" | "meal_activity" | "undecided">("meal_only");
  const [location, setLocation] = useState("深圳南山区");
  const [maxMembers, setMaxMembers] = useState(8);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);

  const handleContinue = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setnameError("请输入名字");
      return;
    }
    setnameError("");
    setNameConfirmed(true);
  }, [name]);

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createGroup(trimmed, eventType, location, maxMembers);
    onGroupReady(trimmed, true, "chat-preference");
  }, [name, eventType, location, maxMembers, onGroupReady]);

  const handleJoin = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const result = joinGroup(trimmed, inviteCode);
    if (result === "NOT_FOUND") {
      setInviteError("尚未有人创建聚会");
    } else if (result === "WRONG_CODE") {
      setInviteError("邀请码不正确");
    } else if (result === "NAME_TAKEN") {
      setInviteError("这个名字已被使用，换一个试试");
    } else if (result === "FULL") {
      setInviteError("聚会已满员，无法加入");
    } else if (result) {
      onGroupReady(trimmed, false, "chat-preference");
    }
  }, [name, inviteCode, onGroupReady]);

  const handleDemo = useCallback(() => {
    createDemoGroup();
    onGroupReady("小明", true, "overview");
  }, [onGroupReady]);

  const handleCodeChange = useCallback((val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    setInviteCode(digits);
    if (inviteError) setInviteError("");
  }, [inviteError]);

  const handleCodeKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inviteCode.length === 4) {
      handleJoin();
    }
  }, [inviteCode, handleJoin]);

  const backToName = useCallback(() => {
    setName("");
    setNameConfirmed(false);
    setnameError("");
  }, []);

  const backToChoices = useCallback(() => {
    setStep("idle");
    setInviteCode("");
    setInviteError("");
  }, []);

  const showChoices = nameConfirmed && step === "idle";
  const existingGroup = loadGroup();

  // ── styles (reusable) ──────────────────────────────────────────────────
  const s: Record<string, React.CSSProperties> = {
    overlay: {
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,.55)",
      backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    },
    panel: {
      background: "var(--surface)", borderRadius: "var(--r)",
      width: "90%", maxWidth: 420,
      border: "1px solid var(--border2)", boxShadow: "var(--shh)",
      animation: "si .35s var(--sp) both",
      padding: 0, overflow: "hidden",
    },
    body: {
      padding: "32px 28px 28px",
    },
    heading: {
      fontFamily: "var(--fd)", fontSize: 22, letterSpacing: "-.02em",
      color: "var(--text)", marginBottom: 6,
    },
    sub: {
      fontSize: 12, color: "var(--muted)", fontFamily: "var(--fb)",
      marginBottom: 20, lineHeight: 1.55,
    },
    input: {
      width: "100%", padding: "11px 14px", boxSizing: "border-box" as const,
      borderRadius: "var(--rs)", border: "1px solid var(--border2)",
      background: "var(--bg)", fontSize: 14, color: "var(--text)",
      outline: "none", fontFamily: "var(--fb)",
      transition: "border-color .2s",
    },
    btn: {
      width: "100%", padding: "11px 0", border: "none",
      borderRadius: "var(--rs)", fontSize: 13, fontWeight: 500,
      cursor: "pointer", fontFamily: "var(--fb)",
      transition: "all .2s var(--eo)",
    },
    actionBtn: {
      background: "var(--text)", color: "var(--bg)",
    },
    ghostBtn: {
      background: "transparent", color: "var(--muted)",
      border: "1px solid var(--border2)",
    },
    error: {
      fontSize: 11, color: "oklch(55% .18 26)", fontFamily: "var(--fb)",
      marginTop: 6,
    },
    backBtn: {
      background: "none", border: "none", cursor: "pointer",
      fontFamily: "var(--fb)", fontSize: 12, color: "var(--muted)",
      padding: "6px 0", display: "inline-flex", alignItems: "center", gap: 4,
    },
  };

  return (
    <div style={s.overlay}>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="关闭"
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 1010,
            width: 32, height: 32, borderRadius: "50%",
            border: "1px solid var(--border2)", background: "var(--surface)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 16, color: "var(--muted)",
            boxShadow: "var(--sh)",
          }}
        >
          ×
        </button>
      )}
      <div style={s.panel}>
        <div style={s.body}>
          {/* ── Idle: Name Input or Choices ───────────────────────────── */}
          {step === "idle" && (
            <div style={{ animation: "fu .35s var(--sp) both" }}>
              {!showChoices ? (
                <>
                  <h2 style={s.heading}>加入聚会</h2>
                  <p style={s.sub}>先告诉我们你的名字</p>
                  <input
                    autoFocus
                    value={name}
                    onChange={e => { setName(e.target.value); if (nameError) setnameError(""); }}
                    onFocus={e => (e.target.style.borderColor = "var(--border)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border2)")}
                    onKeyDown={e => { if (e.key === "Enter") handleContinue(); }}
                    placeholder="输入你的名字"
                    style={s.input}
                  />
                  {nameError && <p style={s.error}>{nameError}</p>}
                  <button
                    onClick={handleContinue}
                    style={{ ...s.btn, ...s.actionBtn, marginTop: 14 }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "var(--shh)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    继续 →
                  </button>
                  {!existingGroup && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 14px" }}>
                        <div style={{ height: 1, background: "var(--border2)", flex: 1 }} />
                        <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--fb)" }}>或</span>
                        <div style={{ height: 1, background: "var(--border2)", flex: 1 }} />
                      </div>
                      <button
                        onClick={handleDemo}
                        data-testid="load-demo-case"
                        style={{
                          ...s.btn,
                          background: "oklch(95% .04 228)",
                          color: "oklch(38% .14 228)",
                          border: "1px solid oklch(85% .08 228)",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "var(--sh)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        ✨ 体验完整案例（5 人）
                      </button>
                      <p style={{ ...s.sub, margin: "8px 6px 0", textAlign: "center", fontSize: 10 }}>
                        一键载入口味、预算和忌口互相冲突的路演数据
                      </p>
                    </>
                  )}
                </>
              ) : (
                <div style={{ animation: "fu .35s var(--sp) both" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "var(--bg)", border: "1px solid var(--border2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--fd)", fontSize: 13, fontWeight: 600, color: "var(--text)",
                    }}>
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", fontFamily: "var(--fb)" }}>{name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>你好！想做什么？</div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setStep("create"); }}
                    style={{
                      ...s.btn, ...s.actionBtn, marginBottom: 8,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "var(--shh)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    🎉 创建新聚会
                  </button>

                  <button
                    onClick={() => { setStep("join"); }}
                    style={{
                      ...s.btn, ...s.ghostBtn, marginBottom: 12,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--muted)"; }}
                  >
                    🔗 输入邀请码加入
                  </button>

                  <button
                    onClick={backToName}
                    style={s.backBtn}
                  >
                    ← 换个名字
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Create Group ──────────────────────────────────────────── */}
          {step === "create" && (
            <div style={{ animation: "fu .35s var(--sp) both" }}>
              <h2 style={s.heading}>创建新聚会</h2>
              <p style={s.sub}>设置活动信息，然后邀请好友</p>

              {existingGroup && (
                <div style={{
                  padding: "10px 13px", borderRadius: "var(--rs)",
                  background: "oklch(96% .04 72)", border: "1px solid oklch(85% .08 72)",
                  fontSize: 12, color: "oklch(40% .14 72)", fontFamily: "var(--fb)",
                  marginBottom: 16, lineHeight: 1.5,
                }}>
                  ⚠️ 已有一个活跃聚会「{existingGroup.ownerName}的聚会」，创建新聚会将覆盖它。
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 5, fontFamily: "var(--fb)" }}>
                  活动类型
                </label>
                <select
                  value={eventType}
                  onChange={e => setEventType(e.target.value as any)}
                  style={{
                    ...s.input, appearance: "none" as const,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                    cursor: "pointer",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--border)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border2)")}
                >
                  {EVENT_TYPES.map(et => (
                    <option key={et.value} value={et.value}>{et.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 5, fontFamily: "var(--fb)" }}>
                  位置
                </label>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="深圳南山区"
                  style={s.input}
                  onFocus={e => (e.target.style.borderColor = "var(--border)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border2)")}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 5, fontFamily: "var(--fb)" }}>
                  最大人数
                </label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={maxMembers}
                  onChange={e => setMaxMembers(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))}
                  style={s.input}
                  onFocus={e => (e.target.style.borderColor = "var(--border)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border2)")}
                />
              </div>

              <button
                onClick={handleCreate}
                style={{ ...s.btn, ...s.actionBtn, marginBottom: 10 }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "var(--shh)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                创建聚会 →
              </button>

              <button onClick={backToChoices} style={s.backBtn}>
                ← 返回
              </button>
            </div>
          )}

          {/* ── Join Group ────────────────────────────────────────────── */}
          {step === "join" && (
            <div style={{ animation: "fu .35s var(--sp) both" }}>
              <h2 style={s.heading}>加入聚会</h2>
              <p style={s.sub}>
                你好 <strong style={{ fontWeight: 500, color: "var(--text)" }}>{name}</strong>，输入邀请码加入
              </p>

              <div style={{ marginBottom: 14 }}>
                <input
                  autoFocus
                  value={inviteCode}
                  onChange={e => handleCodeChange(e.target.value)}
                  onKeyDown={handleCodeKeyDown}
                  onFocus={e => (e.target.style.borderColor = "var(--border)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border2)")}
                  placeholder="0000"
                  maxLength={4}
                  inputMode="numeric"
                  style={{
                    ...s.input, textAlign: "center", fontSize: 28,
                    letterSpacing: ".3em", fontFamily: "var(--fd)",
                    padding: "16px 14px",
                  }}
                />
                {inviteError && <p style={s.error}>{inviteError}</p>}
              </div>

              <button
                onClick={handleJoin}
                disabled={inviteCode.length !== 4}
                style={{
                  ...s.btn,
                  background: inviteCode.length === 4 ? "var(--text)" : "var(--border2)",
                  color: inviteCode.length === 4 ? "var(--bg)" : "var(--muted)",
                  cursor: inviteCode.length === 4 ? "pointer" : "not-allowed",
                  marginBottom: 10,
                  transition: "all .2s var(--eo)",
                  ...(inviteCode.length === 4 ? {} : { boxShadow: "none" }),
                }}
                onMouseEnter={e => { if (inviteCode.length === 4) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "var(--shh)"; }}}
                onMouseLeave={e => { if (inviteCode.length === 4) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}}
              >
                加入聚会 →
              </button>

              <button onClick={backToChoices} style={s.backBtn}>
                ← 返回
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

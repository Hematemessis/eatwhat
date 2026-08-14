"use client";
import { useState } from "react";
import { Guest, GUESTS_DATA } from "./types"; // GUESTS_DATA is the demo fallback only
import { Av, Badge, Btn, Modal, SectionLabel } from "./ui";
import { BellButton } from "./notifications";

// ── Share Modal ───────────────────────────────────────────────────────
export function ShareModal({ onClose, liveGuests }: { onClose: () => void; liveGuests?: Guest[] }) {
  const [copied, setCopied] = useState(false);
  const link = "jintianzhengdiansha.app/e/friday-gathering-x7k2";
  const copy = () => {
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const guests    = liveGuests ?? GUESTS_DATA;
  const confirmed = guests.filter(g => g.status === "confirmed").length;
  const pending   = guests.filter(g => g.status === "pending").length;

  return (
    <Modal onClose={onClose} width={500}>
      <div style={{ padding: "26px 26px 22px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <SectionLabel>邀请好友</SectionLabel>
            <h3 style={{ fontFamily: "var(--fd)", fontSize: 24, letterSpacing: "-.02em", color: "var(--text)" }}>分享聚会链接</h3>
          </div>
          <button onClick={onClose} style={{ background: "var(--bg)", border: "none", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>×</button>
        </div>

        <div style={{ background: "var(--bg)", borderRadius: "var(--rs)", border: "1px solid var(--border2)", padding: "11px 13px", display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
          <div style={{ flex: 1, fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</div>
          <button onClick={copy} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: copied ? "oklch(92% .07 148)" : "var(--text)", color: copied ? "oklch(34% .13 148)" : "var(--bg)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "var(--fb)", transition: "all .2s var(--sp)", flexShrink: 0 }}>
            {copied ? "✓ 已复制" : "复制"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "var(--bg)", borderRadius: "var(--rs)", border: "1px dashed var(--border)", width: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,7px)", gap: 1.5 }}>
              {Array.from({ length: 25 }, (_, i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: 1, background: [0,1,2,5,9,10,12,14,15,19,20,22,23,24].includes(i) ? "var(--text)" : "var(--border2)" }} />
              ))}
            </div>
            <div style={{ fontSize: 9, color: "var(--muted)", fontFamily: "var(--fb)", fontStyle: "italic" }}>二维码</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[{ l: "已确认", v: confirmed }, { l: "待回复", v: pending }, { l: "总计", v: guests.length }].map(s => (
              <div key={s.l} style={{ background: "var(--bg)", borderRadius: "var(--rs)", padding: "9px 12px", border: "1px solid var(--border2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{s.l}</span>
                <span style={{ fontFamily: "var(--fd)", fontSize: 18, color: "var(--text)" }}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <SectionLabel style={{ marginBottom: 8 }}>嘉宾状态</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {guests.map((g, i) => (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, animation: `fu .3s var(--sp) ${i * 25}ms both` }}>
                <Av ini={g.ini} size={24} delay={i * 25} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{g.name}</span>
                <Badge color={g.status === "confirmed" ? "green" : g.status === "declined" ? "red" : "amber"}>{g.status}</Badge>
                {g.status === "pending" && <button style={{ fontSize: 10, color: "var(--sky)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)" }}>催一下</button>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--rs)", border: "1px solid var(--border2)", background: "var(--bg)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--fb)", color: "var(--muted)" }}>关闭</button>
          <Btn onClick={copy} style={{ padding: "8px 18px", fontSize: 12 }}>发送邀请</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── Create Event Modal ────────────────────────────────────────────────
export function CreateEventModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", date: "", time: "19:00", location: "", budget: "$$", guests: "" });
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const steps = ["基本信息", "邀请好友", "确认"];
  const next = () => step < 2 ? setStep(s => s + 1) : onClose();

  const Field = ({ label, k, placeholder, type = "text" }: { label: string; k: string; placeholder?: string; type?: string }) => (
    <div style={{ marginBottom: 13 }}>
      <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 5 }}>{label}</div>
      <input type={type} value={(form as Record<string,string>)[k]} onChange={e => set(k)(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--rs)", border: "1px solid var(--border2)", background: "var(--bg)", fontSize: 12, outline: "none", transition: "border-color .2s", color: "var(--text)" }}
        onFocus={e => (e.target.style.borderColor = "var(--border)")}
        onBlur={e => (e.target.style.borderColor = "var(--border2)")} />
    </div>
  );

  return (
    <Modal onClose={onClose} width={460}>
      <div style={{ padding: "26px 26px 22px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <SectionLabel>新建聚会 · {steps[step]}</SectionLabel>
            <h3 style={{ fontFamily: "var(--fd)", fontSize: 22, letterSpacing: "-.02em", color: "var(--text)" }}>
              {["填写活动信息", "邀请好友", "确认创建"][step]}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "var(--bg)", border: "none", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>×</button>
        </div>

        <div style={{ display: "flex", gap: 5, marginBottom: 20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ height: 3, flex: 1, borderRadius: 99, background: i <= step ? "var(--text)" : "var(--border2)", transition: "background .3s" }} />
          ))}
        </div>

        {step === 0 && (
          <div style={{ animation: "fu .3s var(--sp) both" }}>
            <Field label="活动名称" k="name" placeholder="周五聚餐计划" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              <Field label="日期" k="date" type="date" />
              <Field label="时间" k="time" type="time" />
            </div>
            <Field label="活动区域" k="location" placeholder="深圳南山区" />
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 7 }}>预算</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["$", "$$", "$$$", "$$$$"].map(t => (
                  <button key={t} onClick={() => set("budget")(t)} style={{ flex: 1, padding: 7, borderRadius: "var(--rs)", border: `1.5px solid ${form.budget === t ? "var(--text)" : "var(--border2)"}`, background: form.budget === t ? "var(--text)" : "transparent", color: form.budget === t ? "var(--bg)" : "var(--muted)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--fb)", transition: "all .2s var(--sp)" }}>{t}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ animation: "fu .3s var(--sp) both" }}>
            <div style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 6 }}>好友邮箱</div>
              <textarea value={form.guests} onChange={e => set("guests")(e.target.value)} placeholder={"xiaoming@example.com\nahua@example.com"}
                style={{ width: "100%", height: 100, padding: "9px 12px", borderRadius: "var(--rs)", border: "1px solid var(--border2)", background: "var(--bg)", fontSize: 12, color: "var(--text)", outline: "none", resize: "none", lineHeight: 1.65, fontFamily: "var(--fb)" }}
                onFocus={e => (e.target.style.borderColor = "var(--border)")}
                onBlur={e => (e.target.style.borderColor = "var(--border2)")} />
            </div>
            <div style={{ background: "oklch(92% .06 228)", borderRadius: "var(--rs)", padding: "11px 13px" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "oklch(38% .14 228)", marginBottom: 2 }}>每位好友会收到专属邀请链接</div>
              <div style={{ fontSize: 11, color: "oklch(48% .1 228)", lineHeight: 1.5 }}>每人填写偏好后，AI 引擎会综合生成方案。</div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: "fu .3s var(--sp) both" }}>
            <div style={{ background: "var(--bg)", borderRadius: "var(--rs)", padding: "4px 0", marginBottom: 12 }}>
              {[["活动", form.name || "(未命名)"], ["日期", form.date ? `${form.date} · ${form.time}` : "未设置"], ["位置", form.location || "未设置"], ["预算", form.budget]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid var(--border2)" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{k}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "oklch(94% .07 72)", borderRadius: "var(--rs)", padding: "11px 13px" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "oklch(44% .15 72)" }}>好友填完偏好后，AI 会自动生成方案。</div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 7, justifyContent: "space-between", marginTop: 20 }}>
          <button onClick={() => step === 0 ? onClose() : setStep(s => s - 1)} style={{ padding: "8px 16px", borderRadius: "var(--rs)", border: "1px solid var(--border2)", background: "var(--bg)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--fb)", color: "var(--muted)" }}>
            {step === 0 ? "取消" : "上一步"}
          </button>
          <Btn onClick={next} style={{ padding: "8px 20px", fontSize: 12 }}>
            {step === 2 ? "创建聚会 →" : step === 1 ? "下一步 →" : "下一步 →"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────
export function Sidebar({
  activeTab, setTab, onInvite, onNewEvent, onBell, unreadCount, liveGuests, maxMembers, hasGroup,
  preferenceCompleted, preferenceRequired, recommendationReady, location,
}: {
  activeTab: string;
  setTab: (t: string) => void;
  onInvite: () => void;
  onNewEvent: () => void;
  onBell: () => void;
  unreadCount: number;
  liveGuests: Guest[];
  maxMembers: number;
  hasGroup: boolean;
  preferenceCompleted: number;
  preferenceRequired: number;
  recommendationReady: boolean;
  location?: string;
}) {
  const confirmed = liveGuests.filter(g => g.status === "confirmed").length;
  const totalSlots = maxMembers || liveGuests.length;
  const tabs = [
    { id: "overview",       icon: "⊞", label: "概览" },
    { id: "chat-preference",icon: "🐦", label: "1 · AI 对话" },
    { id: "preferences",    icon: "◈", label: "2 · 偏好进度", badge: recommendationReady ? `${preferenceCompleted} 已填` : `${preferenceCompleted}/${preferenceRequired}`, badgeColor: "neutral" as const },
    { id: "ai",             icon: "◆", label: "3 · AI 推荐", badge: recommendationReady ? "就绪" : "未解锁", badgeColor: recommendationReady ? "green" as const : "neutral" as const },
  ];

  return (
    <aside style={{
      width: 268, flexShrink: 0, background: "var(--surface)",
      borderRight: "1px solid var(--border2)", display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    }}>
      {/* Logo row */}
      <div style={{ padding: "18px 18px 0", display: "flex", alignItems: "center", justifyContent: "space-between", animation: "fi .4s both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <circle cx="5" cy="5" r="3" fill="var(--bg)" />
              <circle cx="9" cy="9" r="3" fill="var(--bg)" opacity=".5" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.02em", color: "var(--text)" }}>今天整点啥</span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <BellButton onClick={onBell} unread={unreadCount} />
          <button
            onClick={onNewEvent} title="新建聚会"
            style={{ background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, color: "var(--muted)", transition: "all .2s" }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.background = "var(--text)"; b.style.color = "var(--bg)"; b.style.borderColor = "var(--text)"; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.background = "var(--bg)"; b.style.color = "var(--muted)"; b.style.borderColor = "var(--border2)"; }}
          >+</button>
        </div>
      </div>

      {/* Event info */}
      <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid var(--border2)", animation: "fu .5s var(--sp) .05s both" }}>
        <div style={{ marginBottom: 6 }}>
          <Badge color={hasGroup ? "green" : "neutral"}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block", animation: "pd 2s infinite" }} />
            {hasGroup ? "进行中" : "等待开始"}
          </Badge>
        </div>
        <h1 style={{ fontFamily: "var(--fd)", fontSize: 20, lineHeight: 1.1, letterSpacing: "-.02em", marginTop: 7, marginBottom: 8, color: "var(--text)" }}>
          {hasGroup ? <><span>周五</span><br /><span>聚餐计划</span></> : <><span>创建你的</span><br /><span>聚会计划</span></>}
        </h1>
        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>
          {hasGroup ? <><div>周五 19:00</div><div>{location || "待确认区域"}</div></> : <><div>先设置身份和活动</div><div>再邀请成员填写偏好</div></>}
        </div>
      </div>

      {/* RSVPs */}
      <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border2)", animation: "fu .5s var(--sp) .1s both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em" }}>已回复</span>
          <span style={{ fontFamily: "var(--fd)", fontSize: 18, color: "var(--text)" }}>
            {confirmed}<span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)" }}>/{totalSlots}</span>
          </span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: "var(--border2)", overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", borderRadius: 99, background: "var(--text)", width: `${(confirmed / (totalSlots || 1)) * 100}%`, transition: "width 1s var(--eo)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {liveGuests.map((g, i) => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, animation: `fu .4s var(--sp) ${0.12 + i * 0.04}s both` }}>
              <Av ini={g.ini} size={23} delay={100 + i * 30} />
              <span style={{ flex: 1, fontSize: 11, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{g.name}</span>
              <div style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: g.status === "confirmed" ? "var(--sage)" : g.status === "declined" ? "var(--coral)" : "var(--amber)" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "8px 8px", flex: 1 }}>
        {tabs.map((t, i) => {
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "8px 10px", borderRadius: "var(--rs)", border: "none",
              cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12,
              fontWeight: active ? 500 : 400,
              background: active ? "var(--bg)" : "transparent",
              color: active ? "var(--text)" : "var(--muted)",
              boxShadow: active ? "var(--sh)" : "none",
              transition: "all .18s var(--eo)", marginBottom: 1, textAlign: "left",
              animation: `fu .4s var(--sp) ${0.22 + i * 0.05}s both`,
            }}>
              <span style={{ fontSize: 11, opacity: .7 }}>{t.icon}</span>
              {t.label}
              {t.badge && <span style={{ marginLeft: "auto" }}><Badge color={t.badgeColor}>{t.badge}</Badge></span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom buttons */}
      <div style={{ padding: "8px 10px 16px", display: "flex", flexDirection: "column", gap: 5, animation: "fu .5s var(--sp) .4s both" }}>
        <button onClick={hasGroup ? onInvite : onNewEvent}
          style={{ width: "100%", padding: 8, borderRadius: "var(--rs)", border: "1.5px dashed var(--border)", background: "transparent", fontSize: 11, fontWeight: 500, color: "var(--muted)", cursor: "pointer", fontFamily: "var(--fb)", transition: "all .2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}>
          {hasGroup ? "+ 邀请好友" : "+ 创建 / 加入聚会"}
        </button>
      </div>
    </aside>
  );
}

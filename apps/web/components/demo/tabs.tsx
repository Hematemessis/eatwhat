"use client";
import { useState, useEffect, useRef } from "react";
import { Guest, Restaurant, Tweaks, avColor, bgMap, fgMap } from "./types";
import { Av, Badge, Card, Bracket, SectionLabel } from "./ui";
import { Activity } from "./types";
import { getRecommendationReadiness, type GroupState, type RecommendationReadiness } from "@/lib/group-store";

// ── Helpers ─────────────────────────────────────────────────────────────────
function Counter({ to, duration = 900 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * to));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{val}</>;
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

function LiveActivity({ liveGuests }: { liveGuests: Guest[] }) {
  const typing = liveGuests.filter(g => g.status === "pending" || (!g.vibe && g.status === "confirmed"));
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);
  useEffect(() => {
    if (!typing.length) return;
    const iv = setInterval(() => {
      setShow(false);
      setTimeout(() => { setIdx(i => (i + 1) % typing.length); setShow(true); }, 350);
    }, 2800);
    return () => clearInterval(iv);
  }, [typing.length]);
  if (!typing.length) return null;
  const cur = typing[idx % typing.length]!;
  return (
    <div style={{ background: "var(--surface)", borderRadius: "var(--r)", border: "1px solid var(--border2)", padding: "12px 16px", marginBottom: 10, boxShadow: "var(--sh)", animation: "fu .45s var(--sp) .35s both", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "linear-gradient(180deg,var(--sage),transparent)", borderRadius: "3px 0 0 3px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sage)", animation: "pd 2s infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>实时动态</span>
        </div>
        <span style={{ fontSize: 10, color: "var(--muted)" }}>{typing.length} 待回复</span>
      </div>
      <div style={{ opacity: show ? 1 : 0, transition: "opacity .3s var(--eo)", display: "flex", alignItems: "center", gap: 8, minHeight: 28 }}>
        <Av ini={cur.ini} size={22} />
        <span style={{ fontSize: 12, color: "var(--text)" }}>
          <strong style={{ fontWeight: 500 }}>{cur.name.split(" ")[0]}</strong>
          {" "}<span style={{ color: "var(--muted)" }}>{!cur.vibe ? "正在填偏好" : "刚刚加入"}</span>
          {!cur.vibe && <TypingDots />}
        </span>
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 9, alignItems: "center" }}>
        {liveGuests.map(g => (
          <div key={g.id} title={g.name} style={{ width: 18, height: 18, borderRadius: "50%", background: bgMap[avColor(g.ini)], color: fgMap[avColor(g.ini)], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 600, opacity: g.vibe ? 1 : 0.35, transition: "opacity .4s", border: g.vibe ? "1.5px solid var(--sage)" : "1.5px solid transparent" }}>{g.ini}</div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)" }}>{liveGuests.filter(g => g.vibe).length}/{liveGuests.length} 人已填偏好</div>
      </div>
    </div>
  );
}

// ── Massive Footer ───────────────────────────────────────────────────────────
export function MassiveFooter({ eventName = "周五聚餐计划", location = "深圳南山区" }: { eventName?: string; location?: string }) {
  return (
    <footer style={{ background: "var(--text)", marginTop: 72, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(var(--border2) 1px,transparent 1px),linear-gradient(90deg,var(--border2) 1px,transparent 1px)", backgroundSize: "40px 40px", opacity: .06, pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: -20, top: -30, fontFamily: "var(--fd)", fontSize: 240, color: "rgba(255,255,255,.03)", lineHeight: 1, pointerEvents: "none", userSelect: "none", letterSpacing: "-10px" }}>GP</div>
      <div style={{ position: "relative", padding: "52px 32px 32px", maxWidth: 820 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 40, marginBottom: 48 }}>
          <div style={{ minWidth: 160 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="3" fill="rgba(255,255,255,.9)" /><circle cx="9" cy="9" r="3" fill="rgba(255,255,255,.4)" /></svg>
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.02em", color: "white" }}>今天整点啥</span>
            </div>
            <div style={{ fontFamily: "var(--fd)", fontSize: 32, lineHeight: 1.1, letterSpacing: "-.03em", color: "white", marginBottom: 12 }}>{eventName}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>
              <div>周五 19:00</div>
              <div>{location}</div>
            </div>
          </div>

        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,.08)", marginBottom: 20 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>© 2026 今天整点啥</div>
          <div style={{ display: "flex", gap: 16 }}>
            {["隐私", "条款", "GitHub", "文档"].map(l => (
              <span key={l} style={{ fontSize: 11, color: "rgba(255,255,255,.35)", cursor: "pointer", transition: "color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.7)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.35)")}>{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────
export function OverviewTab({ setTab, liveGuests, inviteCode, isOwner, group }: { setTab: (t: string) => void; liveGuests: Guest[]; inviteCode?: string; isOwner?: boolean; group?: GroupState | null }) {
  const confirmed = liveGuests.filter(g => g.status === "confirmed");
  const dietary: Record<string, number> = {};
  confirmed.forEach(g => g.dietary.forEach(d => { dietary[d] = (dietary[d] || 0) + 1; }));
  const cuisines: Record<string, number> = {};
  confirmed.forEach(g => g.cuisine.forEach(c => { cuisines[c] = (cuisines[c] || 0) + 1; }));
  const budgets: Record<string, number> = { "$": 0, "$$": 0, "$$$": 0 };
  confirmed.forEach(g => { if (budgets[g.budget] !== undefined) budgets[g.budget] = (budgets[g.budget] ?? 0) + 1; });
  const topC = Object.entries(cuisines).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxC = topC[0]?.[1] ?? 1;
  const readiness = getRecommendationReadiness(group);
  const hasGroup = Boolean(group);

  if (!hasGroup) {
    return (
      <div data-testid="demo-empty-state" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "64px 48px 36px", borderBottom: "1px solid var(--border2)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: 48, top: 24, fontFamily: "var(--fd)", fontSize: 150, lineHeight: 1, color: "var(--text)", opacity: .035, pointerEvents: "none" }}>?</div>
          <SectionLabel style={{ marginBottom: 12 }}>开始一次群体决策</SectionLabel>
          <h2 style={{ fontFamily: "var(--fd)", fontSize: 56, lineHeight: .98, letterSpacing: "-.04em", color: "var(--text)", marginBottom: 16 }}>
            先把人聚齐，<br /><em>再让 AI 帮你拍板</em>
          </h2>
          <p style={{ maxWidth: 520, fontSize: 13, lineHeight: 1.7, color: "var(--muted)" }}>
            创建或加入聚会后，成员分别填写口味、预算与忌口。收集到至少两份偏好，才会开放群体推荐。
          </p>
        </div>
        <div style={{ padding: "28px 48px", maxWidth: 820 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            {[
              ["01", "创建聚会", "设置地点与人数"],
              ["02", "收集偏好", "至少两位成员完成"],
              ["03", "生成方案", "比较约束与妥协"],
            ].map(([index, title, description]) => (
              <Card key={index} hover={false} style={{ padding: "20px 18px" }}>
                <div style={{ fontFamily: "var(--fd)", fontSize: 11, color: "var(--muted)", marginBottom: 18 }}>{index}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{description}</div>
              </Card>
            ))}
          </div>
        </div>
        <MassiveFooter eventName="开始体验" location="待选择区域" />
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <div style={{ padding: "40px 32px 32px", position: "relative", overflow: "hidden", borderBottom: "1px solid var(--border2)" }}>
        <div style={{ position: "absolute", right: 32, top: 24, opacity: .06, pointerEvents: "none" }}>
          <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
            <circle cx="90" cy="90" r="80" stroke="var(--text)" strokeWidth="1" />
            <circle cx="90" cy="90" r="55" stroke="var(--text)" strokeWidth="1" />
            <circle cx="90" cy="90" r="30" stroke="var(--text)" strokeWidth="1" />
            <line x1="10" y1="90" x2="170" y2="90" stroke="var(--text)" strokeWidth="1" />
            <line x1="90" y1="10" x2="90" y2="170" stroke="var(--text)" strokeWidth="1" />
          </svg>
        </div>
        <div style={{ animation: "fu .45s var(--sp) both", maxWidth: 480, position: "relative" }}>
          <SectionLabel style={{ marginBottom: 10 }}>活动概览</SectionLabel>
          <h2 style={{ fontFamily: "var(--fd)", fontSize: 56, lineHeight: .98, letterSpacing: "-.04em", color: "var(--text)", marginBottom: 14, textWrap: "balance" as React.CSSProperties["textWrap"] }}>
            周五<br /><em>聚餐计划</em>
          </h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Badge color="green"><span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block", animation: "pd 2s infinite" }} />进行中</Badge>
            <Badge>周五 19:00</Badge>
            <Badge>{group?.location || "待确认区域"}</Badge>
          </div>
        </div>
      </div>

      {isOwner && inviteCode && (
        <div style={{ padding: "12px 32px", background: "oklch(95% .04 228)", borderBottom: "1px solid oklch(85% .08 228)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--fb)" }}>邀请码</span>
          <span style={{ fontFamily: "var(--fd)", fontSize: 28, letterSpacing: "6px", color: "var(--text)" }}>
            {inviteCode}
          </span>
          <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--fb)" }}>
            分享给朋友即可加入
          </span>
        </div>
      )}

      <div style={{ padding: "24px 32px 0", maxWidth: 820 }}>
        <LiveActivity liveGuests={liveGuests} />

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
          {[
            { label: "已确认", val: confirmed.length, sub: `共 ${liveGuests.length} 人`,  acc: "var(--sage)"  },
            { label: "饮食需求", val: Object.keys(dietary).length, sub: "不同需求", acc: "var(--sky)" },
            { label: "距离活动",  val: 5,               sub: "周五",   acc: "var(--amber)" },
          ].map((s, i) => (
            <Card key={s.label} delay={50 + i * 55} style={{ padding: "18px 20px", overflow: "hidden", position: "relative" }}>
              <Bracket size={16} color="var(--border2)" style={{ position: "absolute", top: 8, right: 8 }} />
              <div style={{ fontFamily: "var(--fd)", fontSize: 42, letterSpacing: "-.04em", marginBottom: 2, lineHeight: 1, color: "var(--text)" }}>
                <Counter to={s.val} duration={700 + i * 100} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2, color: "var(--text)" }}>{s.label}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 12 }}>{s.sub}</div>
              <div style={{ height: 2.5, background: s.acc, borderRadius: 99, width: "36%" }} />
            </Card>
          ))}
        </div>

        {/* Cuisine chart */}
        <Card delay={180} style={{ padding: "18px 20px", marginBottom: 10 }}>
          <SectionLabel style={{ marginBottom: 12 }}>口味偏好</SectionLabel>
          {topC.map(([name, count], i) => (
            <div key={name} style={{ marginBottom: 10, animation: `fu .4s var(--sp) ${260 + i * 48}ms both` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 500, color: "var(--text)", fontFamily: i === 0 ? "var(--fd)" : "var(--fb)", letterSpacing: i === 0 ? "-.01em" : 0 }}>{name}</span>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>{count} 票</span>
              </div>
              <div style={{ height: i === 0 ? 7 : 5, borderRadius: 99, background: "var(--border2)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: i === 0 ? "var(--text)" : i === 1 ? "var(--muted)" : "var(--border)", width: `${(count / maxC) * 100}%`, animation: `bg .8s var(--eo) ${340 + i * 48}ms both` } as React.CSSProperties} />
              </div>
            </div>
          ))}
        </Card>

        {/* Dietary + Budget */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <Card delay={310} style={{ padding: "16px 18px" }}>
            <SectionLabel style={{ marginBottom: 9 }}>饮食需求</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Object.entries(dietary).map(([d, c]) => <Badge key={d} color="blue">{d} ×{c}</Badge>)}
            </div>
          </Card>
          <Card delay={355} style={{ padding: "16px 18px" }}>
            <SectionLabel style={{ marginBottom: 9 }}>预算分布</SectionLabel>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 52 }}>
              {Object.entries(budgets).map(([tier, cnt]) => (
                <div key={tier} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ height: `${Math.max(cnt * 14, 4)}px`, borderRadius: 4, background: cnt > 0 ? "var(--text)" : "var(--border2)", marginBottom: 4, transition: "height .6s var(--eo)" }} />
                  <div style={{ fontSize: 11, fontWeight: 500, color: cnt > 0 ? "var(--text)" : "var(--muted)" }}>{tier}</div>
                  <div style={{ fontSize: 9, color: "var(--muted)" }}>{cnt}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* CTA */}
        <Card delay={400} style={{ padding: "18px 20px", background: "var(--text)", borderWidth: 0, position: "relative", overflow: "hidden", marginBottom: 0 }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.04)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -20, left: 120, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,.03)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "relative" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "white", marginBottom: 2 }}>
                {!hasGroup ? "先创建或加入聚会" : readiness.ready ? "可以生成群体方案了" : "还需要更多偏好"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)" }}>
                {!hasGroup
                  ? "完成身份设置后，再开始收集成员偏好"
                  : readiness.ready
                    ? `已收集 ${readiness.completed} 人偏好 — 群体决策信号已就绪`
                    : `已收集 ${readiness.completed}/${readiness.required} 人偏好 · 还差 ${readiness.remaining} 人`}
              </div>
            </div>
            <button onClick={() => setTab(readiness.ready ? "ai" : "chat-preference")}
              data-testid="overview-primary-action"
              style={{ padding: "9px 18px", borderRadius: "var(--rs)", border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.12)", color: "white", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--fb)", whiteSpace: "nowrap", transition: "background .2s", backdropFilter: "blur(8px)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.22)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.12)")}>
              {readiness.ready ? "生成方案 →" : "收集偏好 →"}
            </button>
          </div>
        </Card>
      </div>
      <MassiveFooter location={group?.location} />
    </div>
  );
}

// ── Preferences Tab ──────────────────────────────────────────────────────────
export function PreferencesTab({ liveGuests }: { liveGuests: Guest[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const [notes, setNotes] = useState(() => typeof window !== "undefined" ? localStorage.getItem("gp_notes") || "" : "");
  const list = liveGuests.filter(g => g.status !== "declined");
  const g = sel !== null ? list[sel] : null;

  return (
    <div>
      <div style={{ padding: "40px 32px 24px", borderBottom: "1px solid var(--border2)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 32, top: 20, opacity: .05, pointerEvents: "none" }}>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <rect x="10" y="10" width="100" height="100" stroke="var(--text)" strokeWidth="1" />
            <rect x="30" y="30" width="60" height="60" stroke="var(--text)" strokeWidth="1" />
            <line x1="10" y1="60" x2="110" y2="60" stroke="var(--text)" strokeWidth="1" />
            <line x1="60" y1="10" x2="60" y2="110" stroke="var(--text)" strokeWidth="1" />
          </svg>
        </div>
        <SectionLabel style={{ marginBottom: 10 }}>好友偏好</SectionLabel>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 48, lineHeight: .98, letterSpacing: "-.04em", color: "var(--text)", textWrap: "balance" as React.CSSProperties["textWrap"] }}>
          每个人<br /><em>想要什么</em>
        </h2>
      </div>

      <div style={{ padding: "24px 32px 0", maxWidth: 820 }}>
        {/* Host notes */}
        <Card delay={0} style={{ padding: "16px 18px", marginBottom: 14 }}>
          <SectionLabel style={{ marginBottom: 8 }}>组织者备注 & 额外偏好</SectionLabel>
          <textarea value={notes}
            onChange={e => { setNotes(e.target.value); localStorage.setItem("gp_notes", e.target.value); }}
            placeholder={"添加约束条件、特殊需求，或给 AI 的额外提示…\n例如「有人过生日」或「避开太吵的地方」"}
            style={{ width: "100%", minHeight: 76, padding: "10px 12px", borderRadius: "var(--rs)", border: "1px solid var(--border2)", background: "var(--bg)", fontSize: 12, outline: "none", resize: "vertical", lineHeight: 1.65, transition: "border-color .2s", color: "var(--text)", fontFamily: "var(--fb)" }}
            onFocus={e => (e.target.style.borderColor = "var(--border)")}
            onBlur={e => (e.target.style.borderColor = "var(--border2)")} />
          {notes && (
            <div style={{ marginTop: 5, fontSize: 10, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "var(--sage)" }}>✓</span> 已保存 · 将被纳入 AI 方案生成
            </div>
          )}
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(185px,1fr))", gap: 8, marginBottom: 12 }}>
          {list.map((guest, i) => (
            <Card key={guest.id} delay={i * 35} onClick={() => setSel(sel === i ? null : i)} style={{ padding: "13px 14px", borderColor: sel === i ? "var(--border)" : "var(--border2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Av ini={guest.ini} size={27} delay={i * 35} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{guest.name.split(" ")[0]}</div>
                  <Badge color={guest.status === "confirmed" ? "green" : guest.status === "declined" ? "red" : "amber"}>{guest.status}</Badge>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
                {guest.dietary.map(d => <Badge key={d} color="blue">{d}</Badge>)}
                <Badge>{guest.budget}</Badge>
              </div>
              {guest.vibe
                ? <div style={{ fontSize: 10, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.5 }}>&quot;{guest.vibe}&quot;</div>
                : guest.status === "pending" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--muted)" }}>
                    <span>正在填偏好</span><TypingDots />
                  </div>
                )}
            </Card>
          ))}
        </div>

        {g && (
          <Card delay={0} style={{ padding: "16px 18px", marginBottom: 12, animation: "si .3s var(--sp) both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Av ini={g.ini} size={34} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{g.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>详细信息</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {([["饮食", g.dietary.length ? g.dietary.join(", ") : "无"], ["口味", g.cuisine.join(", ")], ["预算", g.budget]] as [string,string][]).map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: label === "Budget" ? 22 : 12, fontFamily: label === "Budget" ? "var(--fd)" : "var(--fb)", color: "var(--text)" }}>{val}</div>
                </div>
              ))}
            </div>
            {g.vibe && (
              <div style={{ marginTop: 11, padding: "9px 12px", background: "var(--bg)", borderRadius: "var(--rs)", borderLeft: "3px solid var(--muted)" }}>
                <div style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 2 }}>Vibe</div>
                <div style={{ fontSize: 11, fontStyle: "italic", color: "var(--text)" }}>{g.vibe}</div>
              </div>
            )}
          </Card>
        )}
      </div>
      <MassiveFooter eventName="Guest Preferences" />
    </div>
  );
}

// ── AI Tab ───────────────────────────────────────────────────────────────────
const AI_STEPS = [
  { l: "收集好友偏好", d: "饮食、口味、预算、氛围" },
  { l: "召回候选商家", d: "当前：深圳本地演示数据" },
  { l: "构建决策提示词", d: "偏好矩阵 → 结构化输入" },
  { l: "DeepSeek 合成方案", d: "deepseek-v4-pro" },
  { l: "按偏好匹配排序", d: "每个方案的约束满足度" },
  { l: "生成推荐理由", d: "为每个商家写推荐语" },
];

function RestCard({ r, rank, delay, tweaks, open, onToggle }: { r: Restaurant; rank: number; delay: number; tweaks: Tweaks; open: boolean; onToggle: () => void }) {
  const [h, setH] = useState(false);
  const rc = ["var(--amber)", "var(--muted)", "oklch(60% .1 50)"];
  return (
    <div
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: "var(--surface)", borderRadius: "var(--r)", border: `1px solid ${h ? "var(--border)" : "var(--border2)"}`, boxShadow: h ? "var(--shh)" : "var(--sh)", transition: "all .25s var(--eo)", transform: h ? "translateY(-2px)" : "none", overflow: "hidden", animation: `fu .5s var(--sp) ${delay}ms both`, marginBottom: 10 }}
    >
      <div style={{ height: 3, background: r.accent }} />
      <div style={{ padding: "15px 17px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", border: "1.5px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fd)", fontSize: 14, color: rc[rank - 1], flexShrink: 0 }}>{rank}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.02em", color: "var(--text)" }}>{r.name}</span>
              <Badge color="amber">{r.match}% match</Badge>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>{r.cuisine} · {r.price} · {r.dist} · ★ {r.rating}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>{r.tags.map(t => <Badge key={t}>{t}</Badge>)}</div>
            <div style={{ height: 80, borderRadius: "var(--rs)", background: "var(--bg)", border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 7 }}>
              <span style={{ fontSize: 10, fontFamily: "var(--fb)", fontStyle: "italic", color: "var(--border)", textAlign: "center", opacity: 0.6 }}>photo</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>{r.addr} · {r.hours}</div>
          </div>
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="22" cy="22" r="17" fill="none" stroke="var(--border2)" strokeWidth="2.5" />
              <circle cx="22" cy="22" r="17" fill="none" stroke={r.accent} strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 17 * r.match / 100} ${2 * Math.PI * 17}`} strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 10, fontWeight: 600, marginTop: -2, color: "var(--text)" }}>{r.match}%</div>
          </div>
        </div>
        {tweaks.showAIReasoning && (
          <button onClick={onToggle}
            style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 10, color: "var(--muted)", padding: 0, transition: "color .2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>
            <span style={{ display: "inline-block", transition: "transform .2s var(--sp)", transform: open ? "rotate(90deg)" : "none" }}>▶</span> AI Reasoning
          </button>
        )}
        {open && <div style={{ marginTop: 6, padding: "8px 10px", background: "var(--bg)", borderRadius: "var(--rs)", fontSize: 10, color: "var(--muted)", lineHeight: 1.7, fontFamily: "var(--fb)", animation: "sd .28s var(--sp) both" }}>{r.reasoning}</div>}
      </div>
    </div>
  );
}

interface RealProposal {
  rank: number;
  restaurant_name: string;
  restaurant_addr: string;
  cuisine_type: string;
  cuisine_types: string[];
  price_range: string;
  rating: number;
  review_count: number;
  image_url: string | null;
  maps_url: string | null;
  reasoning: string;
  constraints_met: Record<string, boolean>;
  constraints_gap: Record<string, string>;
}

function RealRestCard({ p, delay, tweaks, open, onToggle }: { p: RealProposal; delay: number; tweaks: Tweaks; open: boolean; onToggle: () => void }) {
  const [h, setH] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const accents = ["var(--amber)", "var(--sage)", "var(--sky)"];
  const accent = accents[(p.rank - 1) % accents.length] ?? "var(--muted)";
  const metKeys = Object.entries(p.constraints_met).filter(([, v]) => v).map(([k]) => k);
  const gapKeys = Object.keys(p.constraints_gap);
  const totalCount = Object.keys(p.constraints_met).length + gapKeys.length;
  const matchPct = totalCount > 0 ? Math.round((metKeys.length / totalCount) * 100) : 90;
  const labelize = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: "var(--surface)", borderRadius: "var(--r)", border: `1px solid ${h ? "var(--border)" : "var(--border2)"}`, boxShadow: h ? "var(--shh)" : "var(--sh)", transition: "all .3s var(--eo)", transform: h ? "translateY(-3px)" : "none", overflow: "hidden", animation: `fu .55s var(--sp) ${delay}ms both`, marginBottom: 14 }}
    >
      {/* Hero image */}
      {p.image_url && imgOk && (
        <div style={{ position: "relative", width: "100%", height: 180, background: "var(--bg2)", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.image_url}
            alt={p.restaurant_name}
            onError={() => setImgOk(false)}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .5s var(--eo)", transform: h ? "scale(1.04)" : "scale(1)" }}
          />
          {/* Gradient overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,.55))", pointerEvents: "none" }} />
          {/* Rank badge */}
          <div style={{ position: "absolute", top: 12, left: 12, width: 36, height: 36, borderRadius: "50%", background: accent, color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fd)", fontSize: 16, boxShadow: "0 2px 8px rgba(0,0,0,.25)" }}>
            {p.rank}
          </div>
          {/* Match ring */}
          <div style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 6, padding: "5px 10px 5px 6px", borderRadius: 99, background: "rgba(255,255,255,.92)", backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
            <svg width="22" height="22" viewBox="0 0 22 22" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="11" cy="11" r="8" fill="none" stroke="var(--border2)" strokeWidth="2" />
              <circle cx="11" cy="11" r="8" fill="none" stroke={accent} strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 8 * matchPct / 100} ${2 * Math.PI * 8}`} strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", fontFamily: "var(--fb)" }}>{matchPct}% match</span>
          </div>
          {/* Name overlay */}
          <div style={{ position: "absolute", bottom: 12, left: 14, right: 14, color: "#fff" }}>
            <div style={{ fontFamily: "var(--fd)", fontSize: 22, lineHeight: 1.1, letterSpacing: "-.02em", textShadow: "0 1px 4px rgba(0,0,0,.4)" }}>{p.restaurant_name}</div>
            <div style={{ fontSize: 11, opacity: .9, marginTop: 3, fontFamily: "var(--fb)" }}>
              {p.cuisine_type} · {p.price_range} · ★ {p.rating} ({p.review_count.toLocaleString()})
            </div>
          </div>
        </div>
      )}

      {/* No-image fallback header */}
      {(!p.image_url || !imgOk) && (
        <>
          <div style={{ height: 3, background: accent }} />
          <div style={{ padding: "16px 18px 0", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fd)", fontSize: 16, flexShrink: 0 }}>{p.rank}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--fd)", fontSize: 20, letterSpacing: "-.02em", color: "var(--text)", lineHeight: 1.1 }}>{p.restaurant_name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, fontFamily: "var(--fb)" }}>
                {p.cuisine_type} · {p.price_range} · ★ {p.rating} ({p.review_count.toLocaleString()})
              </div>
            </div>
            <Badge color="amber">{matchPct}% match</Badge>
          </div>
        </>
      )}

      <div style={{ padding: "14px 18px 16px" }}>
        {/* Cuisine tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
          {p.cuisine_types.map(t => <Badge key={t}>{t}</Badge>)}
        </div>

        {/* Constraints met */}
        {metKeys.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
            {metKeys.map(k => (
              <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 99, background: "oklch(95% .04 148)", color: "oklch(34% .13 148)", fontSize: 10, fontWeight: 600, fontFamily: "var(--fb)" }}>
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 4.5l2.5 2.5L8 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {labelize(k)}
              </span>
            ))}
          </div>
        )}

        {/* Constraint gaps */}
        {gapKeys.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
            {gapKeys.map(k => (
              <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 99, background: "oklch(96% .04 72)", color: "oklch(40% .14 72)", fontSize: 10, fontWeight: 600, fontFamily: "var(--fb)" }} title={p.constraints_gap[k]}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M5 1v5M5 8v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                {labelize(k)}
              </span>
            ))}
          </div>
        )}

        {/* AI reasoning */}
        {tweaks.showAIReasoning && (
          <button onClick={onToggle}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 11, fontWeight: 500, color: "var(--muted)", padding: 0, marginBottom: open ? 8 : 0, transition: "color .2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>
            <span style={{ display: "inline-block", transition: "transform .2s var(--sp)", transform: open ? "rotate(90deg)" : "none" }}>▶</span> AI reasoning
          </button>
        )}
        {open && tweaks.showAIReasoning && (
          <div style={{ padding: "11px 13px", background: "var(--bg)", borderRadius: "var(--rs)", borderLeft: `2px solid ${accent}`, fontSize: 12, color: "var(--text)", lineHeight: 1.65, fontFamily: "var(--fb)", fontStyle: "italic", animation: "sd .28s var(--sp) both", marginBottom: 12 }}>
            &quot;{p.reasoning}&quot;
          </div>
        )}

        {/* Address + actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10, paddingTop: 12, borderTop: "1px solid var(--border2)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--fb)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p.restaurant_addr}
          </div>
          {p.maps_url && (
            <a href={p.maps_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)", fontSize: 11, fontWeight: 500, fontFamily: "var(--fb)", textDecoration: "none", flexShrink: 0, transition: "all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--text)"; e.currentTarget.style.color = "var(--bg)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--text)"; }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1c-2 0-3.5 1.5-3.5 3.5 0 2.5 3.5 4.5 3.5 4.5s3.5-2 3.5-4.5C8.5 2.5 7 1 5 1z" stroke="currentColor" strokeWidth="1.2"/><circle cx="5" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1.2"/></svg>
              Maps
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

interface SynthesizeDebug {
  prompt: string;
  reasoning: string;
  rawResponse: string;
}

export function AITab({ tweaks, addActivity, isOwner, group, onAiDone, readiness }: { tweaks: Tweaks; addActivity: (item: Omit<Activity, "id" | "read">) => void; isOwner?: boolean; group?: GroupState | null; onAiDone?: (proposals: RealProposal[]) => void; readiness?: RecommendationReadiness }) {
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gp_ai") as any;
      // Never restore "running" — it's a dead-end state
      if (saved === "running") return "idle";
      return saved || "idle";
    }
    return "idle";
  });
  const [step, setStep]               = useState(0);
  const [open, setOpen]               = useState<Record<number, boolean>>({});
  const [location, setLocation]       = useState(group?.location || "深圳南山区");
  const [realProposals, setReal]      = useState<RealProposal[]>(() => {
    try { return JSON.parse(localStorage.getItem("gp_ai_proposals") || "null") || []; } catch { return []; }
  });
  const [debug, setDebug]             = useState<SynthesizeDebug>(() => {
    try { return JSON.parse(localStorage.getItem("gp_ai_debug") || "null") || { prompt: "", reasoning: "", rawResponse: "" }; } catch { return { prompt: "", reasoning: "", rawResponse: "" }; }
  });
  const [showDebug, setShowDebug]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  const [waitMsg, setWaitMsg]         = useState(0);
  const abortRef                      = useRef<AbortController | null>(null);
  const storedProposals = group?.aiProposals ?? [];
  const recommendationReadiness = readiness ?? getRecommendationReadiness(group);
  useEffect(() => { localStorage.setItem("gp_ai", phase); }, [phase]);

  const WAIT_MESSAGES = [
    `正在解析 ${group?.members.length ?? 0} 人偏好矩阵…`,
    "正在匹配当前候选商家…",
    "正在构建决策提示词…",
    "正在调用 DeepSeek 综合打分…",
    "正在解析 AI 推荐结果…",
    "正在校验约束满足度…",
  ];

  const run = async () => {
    if (!recommendationReadiness.ready) {
      setErrorMsg(`至少需要 ${recommendationReadiness.required} 位成员完成偏好，目前只有 ${recommendationReadiness.completed} 位。`);
      setPhase("error");
      return;
    }
    setPhase("running"); setStep(0); setErrorMsg(""); setWaitMsg(0);
    const controller = new AbortController();
    abortRef.current = controller;

    // Collect preferences from group members
    const prefs = (group?.members || [])
      .filter((m: any) => m.preferenceStatus === "done" || m.vibe)
      .map((m: any) => ({
        name: m.name,
        dietary: m.dietary || [],
        cuisine: m.cuisine || [],
        budget: m.budget || "$$",
        vibe: m.vibe || null,
      }));

    // Animate 6 steps evenly over ~60s (10s per step)
    const STEP_MS = 10000;
    let s = 0;
    const iv = setInterval(() => {
      s = Math.min(s + 1, AI_STEPS.length - 1);
      setStep(s);
    }, STEP_MS);

    // Cycle the status message every 3s
    const wm = setInterval(() => {
      setWaitMsg(prev => (prev + 1) % WAIT_MESSAGES.length);
    }, 3000);

    // Safety timeout: 120s total
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    try {
      const res = await fetch("/api/demo/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, preferences: prefs }),
        signal: controller.signal,
      });
      clearInterval(iv);
      clearInterval(wm);
      clearTimeout(timeoutId);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Synthesis failed");
      }
      const data = await res.json() as { proposals: RealProposal[]; debug?: SynthesizeDebug };
      setStep(AI_STEPS.length);
      setReal(data.proposals);
      const dbg = data.debug || { prompt: "", reasoning: "", rawResponse: "" };
      setDebug(dbg);
      localStorage.setItem("gp_ai_proposals", JSON.stringify(data.proposals));
      localStorage.setItem("gp_ai_debug", JSON.stringify(dbg));
      if (data.proposals && onAiDone) onAiDone(data.proposals);
      setTimeout(() => {
        setPhase("done");
        addActivity({ type: "ai", ini: "AI", name: "AI Engine", msg: `Synthesis complete — 3 venues ranked in ${location}`, time: "just now" });
      }, 400);
    } catch (err: any) {
      clearInterval(iv);
      clearInterval(wm);
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        setErrorMsg("请求超时或已取消 — 可以重试");
      } else {
        setErrorMsg(err?.message || "Unknown error");
      }
      setPhase("error");
    }
  };

  const reset = () => { setPhase("idle"); setStep(0); setReal([]); setDebug({ prompt: "", reasoning: "", rawResponse: "" }); setShowDebug(false); localStorage.removeItem("gp_ai"); localStorage.removeItem("gp_ai_proposals"); localStorage.removeItem("gp_ai_debug"); };

  if (phase === "idle" || phase === "error") return (
    <div>
      <div style={{ padding: "40px 32px 28px", borderBottom: "1px solid var(--border2)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 24, top: 16, opacity: .05, pointerEvents: "none" }}>
          <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
            {[0,1,2,3,4].map(i => <polygon key={i} points="70,10 130,50 130,90 70,130 10,90 10,50" stroke="var(--text)" strokeWidth="1" fill="none" transform={`rotate(${i * 18} 70 70)`} />)}
          </svg>
        </div>
        <SectionLabel style={{ marginBottom: 10 }}>AI 生成方案</SectionLabel>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 48, lineHeight: .98, letterSpacing: "-.04em", color: "var(--text)", marginBottom: 10, textWrap: "balance" as React.CSSProperties["textWrap"] }}>
          帮你找到<br /><em>最合适的地方</em>
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, maxWidth: 420 }}>AI 根据所有人的偏好，从候选商家中比较硬约束与妥协项，生成融合方案。</p>
      </div>
      <div style={{ padding: "24px 32px", maxWidth: 640 }}>
        <Card delay={85} style={{ padding: "16px 18px", marginBottom: 16 }}>
          <SectionLabel style={{ marginBottom: 12 }}>决策流程</SectionLabel>
          {AI_STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < AI_STEPS.length - 1 ? "1px solid var(--border2)" : "none", animation: `fu .4s var(--sp) ${i * 42 + 65}ms both` }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--bg)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 600, color: "var(--muted)", flexShrink: 0 }}>{i + 1}</div>
              <div><div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{s.l}</div><div style={{ fontSize: 10, color: "var(--muted)" }}>{s.d}</div></div>
            </div>
          ))}
        </Card>
        <div data-testid="venue-data-source" style={{ marginBottom: 14, padding: "10px 12px", borderRadius: "var(--rs)", background: "oklch(96% .03 72)", border: "1px solid oklch(87% .06 72)", color: "oklch(42% .12 72)", fontSize: 11, lineHeight: 1.55, fontFamily: "var(--fb)" }}>
          当前候选数据：深圳南山、福田共 56 家演示样本。实时 POI 数据源尚未接入，因此其他城市不会伪装成“真实搜索结果”。
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6, fontFamily: "var(--fb)" }}>位置</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="深圳南山区"
            style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border2)", borderRadius: "var(--rs)", fontSize: 13, fontFamily: "var(--fb)", color: "var(--text)", background: "var(--bg)", outline: "none", boxSizing: "border-box" }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--text)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--border2)")}
          />
          <div style={{ marginTop: 5, fontSize: 10, color: "var(--muted)", lineHeight: 1.5 }}>
            当前版本建议使用深圳南山或福田；全国覆盖将在接入地图 POI 服务后开放。
          </div>
        </div>
        {phase === "error" && <p style={{ fontSize: 12, color: "oklch(55% 0.18 26)", fontFamily: "var(--fb)", marginBottom: 10 }}>{errorMsg}</p>}
        {!recommendationReadiness.ready ? (
          <div data-testid="ai-readiness-message" style={{ padding: "13px 15px", borderRadius: "var(--rs)", background: "oklch(95% .04 72)", border: "1px solid oklch(86% .08 72)", color: "oklch(44% .15 72)", fontSize: 12, lineHeight: 1.6, fontFamily: "var(--fb)" }}>
            还不能生成群体方案：至少需要 {recommendationReadiness.required} 位成员完成偏好，目前已完成 {recommendationReadiness.completed} 位。
          </div>
        ) : isOwner ? (
          <button
            type="button"
            onClick={run}
            data-testid="generate-recommendations"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, background: "var(--text)", color: "var(--bg)", border: "none", padding: "11px 22px", borderRadius: "var(--rs)", fontWeight: 500, cursor: "pointer", fontFamily: "var(--fb)" }}
          >
            生成方案 →
          </button>
        ) : (
          <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--fb)", padding: "12px 0" }}>
            等待群主生成方案…
          </p>
        )}
      </div>
      <MassiveFooter eventName="AI Synthesis" />
    </div>
  );

  if (phase === "running") return (
    <div style={{ padding: "40px 32px 48px", maxWidth: 520 }}>
      <div style={{ animation: "fu .4s var(--sp) both", marginBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--text)", borderTopColor: "transparent", animation: "sp2 .75s linear infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em" }}>处理中</span>
        </div>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 36, letterSpacing: "-.03em", color: "var(--text)", textWrap: "balance" as React.CSSProperties["textWrap"] }}>正在运行<br /><em>决策引擎</em></h2>
      </div>
      {AI_STEPS.map((s, i) => {
        const done = i < step, active = i === step - 1;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: i < AI_STEPS.length - 1 ? "1px solid var(--border2)" : "none", opacity: i >= step ? .3 : 1, transition: "opacity .35s var(--eo)" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: done ? "var(--text)" : active ? "var(--surface)" : "var(--border2)", border: active ? "2px solid var(--text)" : "none", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .3s var(--sp)" }}>
              {done && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              {active && <div style={{ width: 6, height: 6, borderRadius: "50%", border: "1.5px solid var(--text)", borderTopColor: "transparent", animation: "sp2 .7s linear infinite" }} />}
            </div>
            <div><div style={{ fontSize: 12, fontWeight: done ? 500 : 400, color: "var(--text)" }}>{s.l}</div><div style={{ fontSize: 10, color: "var(--muted)" }}>{s.d}</div></div>
          </div>
        );
      })}
      <p style={{ marginTop: 20, fontSize: 11, color: "var(--muted)", fontFamily: "var(--fb)" }}>{WAIT_MESSAGES[waitMsg]}</p>
      <button
        onClick={() => { abortRef.current?.abort(); }}
        style={{ marginTop: 14, padding: "6px 14px", borderRadius: "var(--rs)", border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--muted)", fontSize: 11, cursor: "pointer", fontFamily: "var(--fb)", transition: "all .2s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--coral)"; e.currentTarget.style.color = "var(--coral)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--muted)"; }}
      >
        取消
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ padding: "40px 32px 24px", borderBottom: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Badge color="green">✓ 完成</Badge>
          <button onClick={reset} style={{ fontSize: 10, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)" }}>重新生成</button>
        </div>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 48, lineHeight: .98, letterSpacing: "-.04em", color: "var(--text)", marginBottom: 5, textWrap: "balance" as React.CSSProperties["textWrap"] }}>
          3 个推荐<br /><em style={{ color: "var(--muted)" }}>为你精选</em>
        </h2>
        <p style={{ fontSize: 11, color: "var(--muted)" }}><strong style={{ color: "var(--text)" }}>{location}</strong> 的候选商家 · 根据 {group?.members.length ?? 0} 人偏好综合排序</p>
      </div>
      <div style={{ padding: "24px 32px 0", maxWidth: 760 }}>
        {realProposals.length > 0 ? (
          realProposals.map((p, i) => (
            <RealRestCard key={i} p={p} delay={i * 80} tweaks={tweaks} open={!!open[i]} onToggle={() => setOpen(prev => ({ ...prev, [i]: !prev[i] }))} />
          ))
        ) : storedProposals.length > 0 ? (
          storedProposals.map((p: RealProposal, i: number) => (
            <RealRestCard key={i} p={p} delay={i * 80} tweaks={tweaks} open={!!open[i]} onToggle={() => setOpen(prev => ({ ...prev, [i]: !prev[i] }))} />
          ))
        ) : null}

        {/* DeepSeek 思维链 */}
        {debug.prompt && (
          <div style={{ marginTop: 12, marginBottom: 24 }}>
            <button
              onClick={() => setShowDebug(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: "var(--surface)", border: "1px solid var(--border2)",
                borderRadius: "var(--r)", padding: "10px 16px",
                cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12,
                color: "var(--text)", fontWeight: 500,
                transition: "all .2s", width: "100%",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; }}
            >
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "2px 8px", borderRadius: 6,
                background: "var(--text)", color: "var(--bg)",
                fontSize: 10, fontWeight: 700,
              }}>
                🧠 思维链
              </span>
              <span style={{ color: "var(--muted)", flex: 1, textAlign: "left" }}>
                DeepSeek 输入输出 · 共 {((debug.prompt || "").length + (debug.reasoning || "").length + (debug.rawResponse || "").length).toLocaleString()} 字符
              </span>
              <span style={{
                display: "inline-block", transition: "transform .2s var(--sp)",
                transform: showDebug ? "rotate(90deg)" : "none",
                color: "var(--muted)", fontSize: 10,
              }}>▶</span>
            </button>

            {showDebug && (
              <div style={{
                marginTop: 8, animation: "sd .25s var(--sp) both",
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                {/* Prompt */}
                <div style={{
                  background: "var(--surface)", borderRadius: "var(--r)",
                  border: "1px solid var(--border2)", overflow: "hidden",
                }}>
                  <div style={{
                    padding: "8px 14px", borderBottom: "1px solid var(--border2)",
                    fontSize: 10, fontWeight: 600, color: "var(--muted)",
                    fontFamily: "var(--fb)", letterSpacing: ".04em",
                    textTransform: "uppercase",
                  }}>
                    📤 发送给 DeepSeek 的 Prompt
                  </div>
                  <pre style={{
                    margin: 0, padding: "14px 16px",
                    fontSize: 11, fontFamily: "var(--fb)",
                    lineHeight: 1.55, color: "var(--text)",
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    maxHeight: 360, overflowY: "auto",
                  }}>{debug.prompt}</pre>
                </div>

                {/* CoT Reasoning */}
                {debug.reasoning && (
                  <div style={{
                    background: "var(--surface)", borderRadius: "var(--r)",
                    border: "1px solid oklch(85% .06 228)", overflow: "hidden",
                  }}>
                    <div style={{
                      padding: "8px 14px", borderBottom: "1px solid var(--border2)",
                      fontSize: 10, fontWeight: 600, color: "var(--muted)",
                      fontFamily: "var(--fb)", letterSpacing: ".04em",
                      textTransform: "uppercase",
                      background: "oklch(97% .01 228)",
                    }}>
                      💭 DeepSeek CoT 推理过程
                    </div>
                    <pre style={{
                      margin: 0, padding: "14px 16px",
                      fontSize: 11, fontFamily: "var(--fb)",
                      lineHeight: 1.55, color: "var(--text)",
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      maxHeight: 300, overflowY: "auto",
                    }}>{debug.reasoning}</pre>
                  </div>
                )}

                {/* Raw response */}
                <div style={{
                  background: "var(--surface)", borderRadius: "var(--r)",
                  border: "1px solid var(--border2)", overflow: "hidden",
                }}>
                  <div style={{
                    padding: "8px 14px", borderBottom: "1px solid var(--border2)",
                    fontSize: 10, fontWeight: 600, color: "var(--muted)",
                    fontFamily: "var(--fb)", letterSpacing: ".04em",
                    textTransform: "uppercase",
                  }}>
                    📥 DeepSeek 原始输出 (JSON)
                  </div>
                  <pre style={{
                    margin: 0, padding: "14px 16px",
                    fontSize: 11, fontFamily: "var(--fb)",
                    lineHeight: 1.55, color: "var(--text)",
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    maxHeight: 400, overflowY: "auto",
                  }}>{debug.rawResponse}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <MassiveFooter eventName="AI Results" />
    </div>
  );
}

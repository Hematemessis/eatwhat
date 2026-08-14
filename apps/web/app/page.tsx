"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tweaks, TWEAKS_DEFAULTS, INITIAL_ACTIVITIES, Guest, Activity, bgMap, fgMap, avColor } from "../components/demo/types";
import { Sidebar, ShareModal, CreateEventModal } from "../components/demo/modals";
import { NotificationPanel } from "../components/demo/notifications";
import { OverviewTab, PreferencesTab, AITab } from "../components/demo/tabs";
import ChatPreference from "../components/demo/ChatPreference";
import { getRecommendationReadiness, loadGroup, updateMemberPrefs, saveAiProposals, clearGroup, type GroupState } from "@/lib/group-store";
import LoginModal from "../components/demo/LoginModal";

function TweaksPanel({ tweaks, setTweaks }: { tweaks: Tweaks; setTweaks: (t: Tweaks) => void }) {
  const toggle = (k: keyof Tweaks) => {
    const n = { ...tweaks, [k]: !tweaks[k] } as Tweaks;
    setTweaks(n);
    if (k === "darkMode") {
      document.body.classList.toggle("dark", n.darkMode);
      if (n.darkMode) document.documentElement.dataset.theme = "dark";
      else delete document.documentElement.dataset.theme;
    }
  };
  const setK = (k: keyof Tweaks, v: string) => setTweaks({ ...tweaks, [k]: v } as Tweaks);

  return (
    <div className="gp-tweaks-panel" style={{ position: "fixed", bottom: 22, right: 22, zIndex: 300, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "15px 17px", width: 230, boxShadow: "var(--shh)", animation: "si .28s var(--sp)", transformOrigin: "bottom right", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>设置</div>
      {(["darkMode", "showAIReasoning", "animations"] as (keyof Tweaks)[]).map(key => (
        <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <span style={{ fontSize: 12, color: "var(--text)" }}>{key === "darkMode" ? "深色模式" : key === "showAIReasoning" ? "AI 推演" : "动画效果"}</span>
          <button onClick={() => toggle(key)} style={{ width: 32, height: 18, borderRadius: 99, border: "none", cursor: "pointer", background: tweaks[key] ? "var(--text)" : "var(--border)", position: "relative", transition: "background .25s", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 1.5, left: tweaks[key] ? 13.5 : 1.5, width: 15, height: 15, borderRadius: "50%", background: "white", transition: "left .2s var(--sp)", boxShadow: "0 1px 4px rgba(0,0,0,.25)", display: "block" }} />
          </button>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 12, color: "var(--text)" }}>主题色</span>
        <select value={tweaks.accentColor} onChange={e => setK("accentColor", e.target.value)} style={{ fontFamily: "var(--fb)", fontSize: 11, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 6px", cursor: "pointer", color: "var(--text)" }}>
          <option value="coral">Coral</option>
          <option value="sage">Sage</option>
          <option value="sky">Sky</option>
          <option value="amber">Amber</option>
        </select>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab]       = useState<string>("overview");
  const [tweaks, setTweaks] = useState<Tweaks>(TWEAKS_DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const [tweaksOn, setTweaksOn] = useState(false);
  const [supaGuests, setSupaGuests] = useState<Guest[] | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [liveGuests, setLiveGuests] = useState<Guest[]>([]);
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [showLogin, setShowLogin] = useState(true);
  const [group, setGroup] = useState<GroupState | null>(null);
  const [currentUser, setCurrentUser] = useState("");
  const [userIsOwner, setUserIsOwner] = useState(false);

  useEffect(() => {
    try {
      const savedTab = localStorage.getItem("gp_tab");
      if (savedTab) setTab(savedTab);
      const savedTweaks = localStorage.getItem("gp_tweaks");
      if (savedTweaks) setTweaks({ ...TWEAKS_DEFAULTS, ...JSON.parse(savedTweaks) });
      const s = localStorage.getItem("gp_activities");
      if (s) setActivities(JSON.parse(s));
      const cu = localStorage.getItem("gp_current_user_v2");
      if (cu) setCurrentUser(cu);
      // Restore group state and skip login if already joined
      const savedGroup = loadGroup();
      if (savedGroup && cu) {
        setGroup(savedGroup);
        setUserIsOwner(savedGroup.ownerName === cu);
        setShowLogin(false);
        setLiveGuests(savedGroup.members.map((m, i) => ({
          id: i + 1, name: m.name, ini: m.ini,
          status: "confirmed" as const,
          dietary: m.dietary, cuisine: m.cuisine,
          budget: m.budget, vibe: m.vibe,
        })));
      }
    } catch {}
    setHydrated(true);
  }, []);

  const addActivity = useCallback((item: Omit<Activity, "id" | "read">) => {
    setActivities(prev => {
      const next = [{ ...item, id: Date.now(), read: false }, ...prev].slice(0, 20);
      localStorage.setItem("gp_activities", JSON.stringify(next));
      return next;
    });
  }, []);

  const unread = activities.filter(a => !a.read).length;

  useEffect(() => { if (hydrated) localStorage.setItem("gp_tab", tab); }, [tab, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("gp_tweaks", JSON.stringify(tweaks));
    document.body.classList.toggle("dark", tweaks.darkMode);
    if (tweaks.darkMode) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
  }, [tweaks, hydrated]);

  // Fetch real guest data from Supabase if authenticated
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: null } }) => {
      if (!user) return;
      supabase
        .from("invitations")
        .select("id, name, email, status, invite_token, guest_preferences(cuisine_prefs, dietary, budget_max, vibe_pref)")
        .then(({ data }: { data: Array<Record<string, unknown>> }) => {
          if (!data?.length) return;
          const mapped: Guest[] = data.map((inv: any, i: number) => {
            const prefs = Array.isArray(inv.guest_preferences) ? inv.guest_preferences[0] : inv.guest_preferences;
            const ini = (inv.name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "??";
            const budget: "$" | "$$" | "$$$" =
              prefs?.budget_max <= 30 ? "$" : prefs?.budget_max <= 60 ? "$$" : "$$$";
            return {
              id: i + 1,
              name: inv.name ?? inv.email ?? "Guest",
              ini,
              status: inv.status === "accepted" ? "confirmed" : inv.status === "declined" ? "declined" : "pending",
              dietary: prefs?.dietary ?? [],
              cuisine: prefs?.cuisine_prefs ?? [],
              budget: prefs?.budget_max ? budget : "$$",
              vibe: prefs?.vibe_pref ?? null,
            };
          });
          setSupaGuests(mapped);
        });
    });
  }, []);

  const handleLoginReady = (userName: string, owner: boolean, nextTab: "overview" | "chat-preference" = "overview") => {
    setCurrentUser(userName);
    setUserIsOwner(owner);
    const g = loadGroup();
    setGroup(g);
    if (g) {
      setLiveGuests(g.members.map((m, i) => ({
        id: i + 1, name: m.name, ini: m.ini,
        status: "confirmed" as const,
        dietary: m.dietary, cuisine: m.cuisine,
        budget: m.budget, vibe: m.vibe,
      })));
    }
    setShowLogin(false);
    setTab(nextTab);
    localStorage.setItem("gp_current_user_v2", userName);
  };

  const handleLogout = () => {
    setCurrentUser("");
    setUserIsOwner(false);
    setShowLogin(true);
    localStorage.removeItem("gp_current_user_v2");
    setLiveGuests([]);
  };

  const handleReset = () => {
    clearGroup();
    setGroup(null);
    setLiveGuests([]);
    setActivities([]);
    setCurrentUser("");
    setUserIsOwner(false);
    setShowLogin(true);
    ["gp_ai","gp_ai_proposals","gp_ai_debug","gp_activities","gp_current_user_v2","gp_tab","gp_scores","gp_voted"].forEach(k => localStorage.removeItem(k));
    // Clear chat rooms
    Object.keys(localStorage).filter(k => k.startsWith("gp_chat_")).forEach(k => localStorage.removeItem(k));
  };

  const handlePrefsCollected = (userName: string, prefs: any) => {
    const updated = updateMemberPrefs(userName, {
      vibe: prefs.vibe ?? null,
      dietary: Array.isArray(prefs.dietary) ? prefs.dietary : [],
      cuisine: Array.isArray(prefs.cuisine) ? prefs.cuisine : [],
      budget: prefs.budget ?? "$$",
    });
    if (updated) {
      setGroup(updated);
      setLiveGuests(updated.members.map((m, i) => ({
        id: i + 1, name: m.name, ini: m.ini,
        status: "confirmed" as const,
        dietary: m.dietary, cuisine: m.cuisine,
        budget: m.budget, vibe: m.vibe,
      })));
      addActivity({ type: "vibe", ini: userName.slice(0, 2).toUpperCase() || "??", name: userName, msg: "偏好已收集", time: "just now" });
    }
  };

  const handleAiDone = (proposals: any[]) => {
    const updated = saveAiProposals(proposals);
    if (updated) setGroup(updated);
  };

  const displayGuests = supaGuests ?? liveGuests;
  const recommendationReadiness = getRecommendationReadiness(group);

  return (
    <div className="gp-app-shell">
      {showLogin && <LoginModal onGroupReady={handleLoginReady} onClose={group ? () => setShowLogin(false) : undefined} />}
      <header className="gp-mobile-topbar">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="打开菜单"
          style={{ background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3h10M2 7h10M2 11h10" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
              <circle cx="5" cy="5" r="3" fill="var(--bg)" />
              <circle cx="9" cy="9" r="3" fill="var(--bg)" opacity=".5" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-.02em", color: "var(--text)" }}>今天整点啥</span>
        </div>
        <button
          onClick={() => setShowNotif(v => !v)}
          aria-label="通知"
          style={{ position: "relative", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
            <path d="M6.5 1a4.5 4.5 0 0 0-4.5 4.5c0 2.5-.8 3.5-1.5 4h12c-.7-.5-1.5-1.5-1.5-4A4.5 4.5 0 0 0 6.5 1z" stroke="var(--text)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M5.5 12.5a1 1 0 0 0 2 0" stroke="var(--text)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          {unread > 0 && (
            <span style={{ position: "absolute", top: -3, right: -3, width: 14, height: 14, borderRadius: "50%", background: "var(--coral)", color: "white", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--surface)" }}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </header>
      <div className={`gp-sidebar-scrim ${navOpen ? "open" : ""}`} onClick={() => setNavOpen(false)} />
      <div className={`gp-sidebar ${navOpen ? "open" : ""}`} style={{ display: "flex", flexShrink: 0 }}>
        <Sidebar
          activeTab={tab}
          setTab={t => { setTab(t); setShowNotif(false); setNavOpen(false); }}
          onInvite={() => { setShowShare(true); setNavOpen(false); }}
          onNewEvent={() => { setShowCreate(true); setNavOpen(false); }}
          onBell={() => setShowNotif(v => !v)}
          unreadCount={unread}
          liveGuests={displayGuests}
          maxMembers={group?.maxMembers ?? displayGuests.length}
          hasGroup={Boolean(group)}
          preferenceCompleted={recommendationReadiness.completed}
          preferenceRequired={recommendationReadiness.required}
          recommendationReady={recommendationReadiness.ready}
          location={group?.location}
        />
      </div>
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: "var(--bg)", position: "relative" }}>
        {!group && !showLogin && (
          <div style={{ padding: "8px 32px", borderBottom: "1px solid var(--border2)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>尚未加入聚会</span>
            <button
              onClick={() => setShowLogin(true)}
              style={{
                fontSize: 11, color: "var(--sky)", background: "var(--bg)",
                border: "1px solid var(--border2)", borderRadius: 6,
                padding: "4px 12px", cursor: "pointer", fontFamily: "var(--fb)",
              }}
            >加入 / 创建聚会</button>
          </div>
        )}
        {group && (
          <div style={{ padding: "8px 32px", borderBottom: "1px solid var(--border2)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>
              {userIsOwner ? "👑 群主" : "🙋 成员"} · {currentUser}
            </span>
            {userIsOwner && group && (
              <span style={{ fontSize: 11, color: "var(--text)", fontFamily: "var(--fd)", letterSpacing: "2px", background: "var(--bg)", padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border2)" }}>
                邀请码: {group.inviteCode}
              </span>
            )}
            <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>
              {group.members.length}/{group.maxMembers} 人 · {group.members.filter(m => m.preferenceStatus === "done").length} 已填偏好
            </span>
            <button
              onClick={() => { if (confirm("确定要重置整个演示吗？所有数据将丢失。")) handleReset(); }}
              style={{
                fontSize: 10, color: "var(--coral)", background: "none",
                border: "1px solid var(--border2)", borderRadius: 5,
                padding: "3px 8px", cursor: "pointer", fontFamily: "var(--fb)",
              }}
              title="重置演示"
            >重置</button>
            <button
              onClick={() => setShowSwitch(v => !v)}
              style={{
                fontSize: 10, color: "var(--muted)", background: "none",
                border: "1px solid var(--border2)", borderRadius: 5,
                padding: "3px 8px", cursor: "pointer", fontFamily: "var(--fb)",
                position: "relative",
              }}
            >切换 ▾</button>
            {showSwitch && (
              <div style={{
                position: "absolute", top: "100%", right: 32, marginTop: 4,
                background: "var(--surface)", border: "1px solid var(--border2)",
                borderRadius: "var(--r)", boxShadow: "var(--shh)", zIndex: 500,
                minWidth: 140, padding: "4px 0", animation: "si .15s var(--sp) both",
              }}>
                {group.members.map(m => (
                  <button
                    key={m.name}
                    onClick={() => {
                      setCurrentUser(m.name);
                      setUserIsOwner(group.ownerName === m.name);
                      localStorage.setItem("gp_current_user_v2", m.name);
                      setShowSwitch(false);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "7px 14px", border: "none", background: "none",
                      cursor: "pointer", fontSize: 12, fontFamily: "var(--fb)",
                      color: currentUser === m.name ? "var(--text)" : "var(--muted)",
                      fontWeight: currentUser === m.name ? 600 : 400,
                    }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: bgMap[avColor(m.ini)], color: fgMap[avColor(m.ini)],
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 7, fontWeight: 700,
                    }}>{m.ini}</span>
                    {m.name}
                    {currentUser === m.name && <span style={{ marginLeft: "auto", fontSize: 9 }}>✓</span>}
                  </button>
                ))}
                <div style={{ height: 1, background: "var(--border2)", margin: "4px 0" }} />
                <button
                  onClick={() => { handleLogout(); setShowSwitch(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, width: "100%",
                    padding: "7px 14px", border: "none", background: "none",
                    cursor: "pointer", fontSize: 12, fontFamily: "var(--fb)",
                    color: "var(--muted)",
                  }}
                >+ 新用户加入</button>
              </div>
            )}
          </div>
        )}
        {tab === "overview"        && <OverviewTab    setTab={setTab} liveGuests={displayGuests} inviteCode={group?.inviteCode} isOwner={userIsOwner} group={group} />}
        {tab === "preferences"      && <PreferencesTab liveGuests={displayGuests} />}
        {tab === "chat-preference" && currentUser && (
          <ChatPreference
            currentUser={currentUser}
            eventType={group?.eventType}
            eventLocation={group?.location}
            inviteCode={group?.inviteCode}
            isOwner={userIsOwner}
            completedPreferences={recommendationReadiness.completed}
            requiredPreferences={recommendationReadiness.required}
            onNavigate={setTab}
            onPreferencesCollected={handlePrefsCollected}
          />
        )}
        {tab === "ai"               && <AITab          tweaks={tweaks} addActivity={addActivity} isOwner={userIsOwner} group={group} onAiDone={handleAiDone} readiness={recommendationReadiness} />}
      </main>
      {/* Floating gear button — always visible */}
      <button
        onClick={() => setTweaksOn(v => !v)}
        title="设置"
        className="gp-tweaks-gear"
        style={{ position: "fixed", bottom: tweaksOn ? 270 : 22, right: 22, zIndex: 450, width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border2)", background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--sh)", transition: "bottom .25s var(--sp), opacity .15s", opacity: tweaksOn ? 1 : 0.7 }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={e => (e.currentTarget.style.opacity = tweaksOn ? "1" : "0.7")}
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" style={{ transition: "transform .35s var(--sp)", transform: tweaksOn ? "rotate(90deg)" : "rotate(0deg)" }}>
          <circle cx="10" cy="10" r="3" stroke="var(--text)" strokeWidth="1.5"/>
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {tweaksOn && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} />}
      {showShare  && <ShareModal  onClose={() => setShowShare(false)} liveGuests={displayGuests} />}
      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} />}
      {showNotif  && <NotificationPanel onClose={() => setShowNotif(false)} activities={activities} setActivities={v => { const next = typeof v === "function" ? v(activities) : v; setActivities(next); localStorage.setItem("gp_activities", JSON.stringify(next)); }} />}
    </div>
  );
}

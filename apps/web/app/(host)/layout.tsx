import Link from 'next/link';
import ThemeToggle from '@/components/host/ThemeToggle';

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top nav */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border2)', padding: '0 28px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 'var(--rs)', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="3" fill="var(--bg)"/><circle cx="9" cy="9" r="3" fill="var(--bg)" opacity=".5"/></svg>
          </div>
          <Link href="/dashboard" style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--text)', textDecoration: 'none', fontFamily: 'var(--fb)' }}>GroupPlan</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', fontFamily: 'var(--fb)', transition: 'color .15s' }}>Events</Link>
          {process.env.NODE_ENV === 'development' && <Link href="/dev" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', fontFamily: 'var(--fb)' }}>Dev</Link>}
          <Link href="/" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', fontFamily: 'var(--fb)' }}>Demo</Link>
          <ThemeToggle />
          <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 'var(--rs)', padding: '3px 8px', fontFamily: 'var(--fb)' }}>Demo host</span>
        </div>
      </header>
      {children}
    </div>
  );
}

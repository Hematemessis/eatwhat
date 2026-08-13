import type { Metadata } from 'next';
import type React from 'react';
import { getDb } from '@/lib/db';

export const metadata: Metadata = { title: 'Cost dashboard' };

type StageStats = { stage: string; totalCost: number; count: number; avgLatency: number; errors: number };
type DayStats = { day: string; totalCost: number; count: number };
type EventCost = { eventId: string; totalCost: number; count: number };

export default async function CostsPage() {
  type AiLogRow = {
    stage: string;
    cost_micros: number | null;
    input_tokens: number | null;
    output_tokens: number | null;
    latency_ms: number | null;
    created_at: string;
    event_id: string;
    error: string | null;
  };
  const db = getDb();
  const logs = db.prepare(
    `SELECT
      COALESCE(provider, kind) AS stage,
      cost_micros,
      input_tokens,
      output_tokens,
      0 AS latency_ms,
      created_at,
      COALESCE(event_id, 'unassigned') AS event_id,
      NULL AS error
    FROM usage_log`,
  ).all() as AiLogRow[];

  const stageMap = new Map<string, StageStats>();
  for (const row of logs) {
    const s = stageMap.get(row.stage) ?? { stage: row.stage, totalCost: 0, count: 0, avgLatency: 0, errors: 0 };
    s.totalCost += row.cost_micros ?? 0;
    s.count += 1;
    s.avgLatency += row.latency_ms ?? 0;
    if (row.error) s.errors += 1;
    stageMap.set(row.stage, s);
  }
  const stageStats: StageStats[] = Array.from(stageMap.values())
    .map(s => ({ ...s, avgLatency: s.count ? s.avgLatency / s.count : 0 }))
    .sort((a, b) => b.totalCost - a.totalCost);

  const today = new Date();
  const dayMap = new Map<string, DayStats>();
  for (let d = 13; d >= 0; d--) {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - d);
    const key = dt.toISOString().slice(0, 10);
    dayMap.set(key, { day: key, totalCost: 0, count: 0 });
  }
  for (const row of logs) {
    if (!row.created_at) continue;
    const key = row.created_at.slice(0, 10);
    if (dayMap.has(key)) {
      const d = dayMap.get(key)!;
      d.totalCost += row.cost_micros ?? 0;
      d.count += 1;
    }
  }
  const dayStats: DayStats[] = Array.from(dayMap.values());

  const eventMap = new Map<string, EventCost>();
  for (const row of logs) {
    const e = eventMap.get(row.event_id) ?? { eventId: row.event_id, totalCost: 0, count: 0 };
    e.totalCost += row.cost_micros ?? 0;
    e.count += 1;
    eventMap.set(row.event_id, e);
  }
  const topEvents: EventCost[] = Array.from(eventMap.values())
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10);

  const topEventIds = topEvents.map(e => e.eventId);
  const eventTitleMap = new Map<string, string>();
  if (topEventIds.length > 0) {
    const placeholders = topEventIds.map(() => '?').join(',');
    const eventRows = db.prepare(`SELECT id, title FROM events WHERE id IN (${placeholders})`).all(...topEventIds) as Array<{ id: string; title: string }>;
    for (const ev of eventRows) {
      eventTitleMap.set(ev.id, ev.title);
    }
  }

  const totalCost = logs.reduce((sum: number, r: AiLogRow) => sum + (r.cost_micros ?? 0), 0);
  const totalRuns = logs.length;
  const avgCostPerRun = totalRuns > 0 ? totalCost / totalRuns : 0;

  const nowMonth = new Date().toISOString().slice(0, 7);
  const capMicros = parseInt(process.env.PIPELINE_COST_CAP_MICROS ?? '5000000', 10);
  const monthSpendMap = new Map<string, number>();
  for (const row of logs) {
    if (!row.created_at || !row.created_at.startsWith(nowMonth)) continue;
    monthSpendMap.set(row.event_id, (monthSpendMap.get(row.event_id) ?? 0) + (row.cost_micros ?? 0));
  }
  const spendCapRows = Array.from(monthSpendMap.entries())
    .map(([eventId, spent]) => ({ eventId, spent }))
    .sort((a, b) => b.spent - a.spent);

  const fmt = (micros: number) => '$' + (micros / 1_000_000).toFixed(4);

  const thStyle: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--fb)', padding: '8px 12px', textAlign: 'left', fontWeight: 600, letterSpacing: '.05em' };
  const tdStyle: React.CSSProperties = { fontSize: 12, fontFamily: 'var(--fb)', padding: '8px 12px', borderBottom: '1px solid var(--border2)' };
  const panelStyle: React.CSSProperties = { background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', boxShadow: 'var(--sh)', overflow: 'hidden', marginBottom: 24 };
  const panelHeaderStyle: React.CSSProperties = { padding: '14px 20px', borderBottom: '1px solid var(--border2)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)', color: 'var(--text)' };

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 32, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 24px' }}>Cost dashboard</h1>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        {[
          { label: 'Lifetime cost', value: fmt(totalCost) },
          { label: 'Total runs', value: totalRuns.toString() },
          { label: 'Avg cost / run', value: fmt(avgCostPerRun) },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '14px 20px', boxShadow: 'var(--sh)', minWidth: 140 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fb)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--text)', letterSpacing: '-.02em' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Spend by stage</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid var(--border2)' }}>
            {['Stage', 'Runs', 'Errors', 'Avg latency', 'Total cost'].map(h => <th key={h} style={thStyle}>{h}</th>)}
          </tr></thead>
          <tbody>
            {stageStats.map(s => (
              <tr key={s.stage}>
                <td style={{ ...tdStyle, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{s.stage}</td>
                <td style={tdStyle}>{s.count}</td>
                <td style={{ ...tdStyle, color: s.errors > 0 ? 'oklch(55% 0.2 26)' : 'var(--muted)' }}>{s.errors}</td>
                <td style={tdStyle}>{s.avgLatency.toFixed(0)}ms</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(s.totalCost)}</td>
              </tr>
            ))}
            {stageStats.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)' }}>No data yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Spend by day (last 14 days)</div>
        <div style={{ padding: '8px 0' }}>
          {dayStats.map(d => {
            const dateLabel = new Date(d.day + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 20px', borderBottom: '1px solid var(--border2)', fontSize: 12, fontFamily: 'var(--fb)' }}>
                <span style={{ width: 56, color: 'var(--muted)', flexShrink: 0 }}>{dateLabel}</span>
                <span style={{ color: 'var(--text)', minWidth: 80 }}>{fmt(d.totalCost)}</span>
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>({d.count} runs)</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Top events by cost</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid var(--border2)' }}>
            {['Event', 'Runs', 'Total cost'].map(h => <th key={h} style={thStyle}>{h}</th>)}
          </tr></thead>
          <tbody>
            {topEvents.map(ev => (
              <tr key={ev.eventId}>
                <td style={tdStyle}>{eventTitleMap.get(ev.eventId) ?? ev.eventId.slice(0, 8) + '...'}</td>
                <td style={tdStyle}>{ev.count}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(ev.totalCost)}</td>
              </tr>
            ))}
            {topEvents.length === 0 && <tr><td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)' }}>No data yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Spend caps — current month</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid var(--border2)' }}>
            {['Event', 'Spent', 'Cap', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}
          </tr></thead>
          <tbody>
            {spendCapRows.map(row => {
              const pct = row.spent / capMicros;
              const statusColor = pct >= 1
                ? 'oklch(55% 0.2 26)'
                : pct > 0.8
                  ? 'oklch(65% 0.15 85)'
                  : 'var(--muted)';
              const statusLabel = pct >= 1 ? 'Cap reached' : pct > 0.8 ? 'Warning' : 'OK';
              return (
                <tr key={row.eventId}>
                  <td style={tdStyle}>{eventTitleMap.get(row.eventId) ?? row.eventId.slice(0, 8) + '...'}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(row.spent)}</td>
                  <td style={tdStyle}>{fmt(capMicros)}</td>
                  <td style={{ ...tdStyle, color: statusColor, fontWeight: 600 }}>{statusLabel}</td>
                </tr>
              );
            })}
            {spendCapRows.length === 0 && <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)' }}>No AI runs this month.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}

import Database from 'better-sqlite3';
import path from 'path';
import type {
  Event as GroupEvent,
  FinalizedPlan,
  GuestPreferences,
  Invitation,
  Proposal,
  Vote,
} from '@groupplan/types';

type DbResult<T> = { data: T; error: { message: string } | null };
type DbRow<T> = T & Record<string, unknown>;

function typedRow<T>(row: Record<string, unknown> | undefined): DbResult<DbRow<T> | null> {
  return { data: (row as DbRow<T> | undefined) ?? null, error: row ? null : { message: 'Not found' } };
}

// ---------------------------------------------------------------------------
// Singleton connection
// ---------------------------------------------------------------------------
let _db: Database.Database | null = null;
const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'eatwhat.db')
  : path.join(process.cwd(), 'data.db');

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initDb();
  }
  return _db;
}

// ---------------------------------------------------------------------------
// Schema init
// ---------------------------------------------------------------------------
export function initDb(): void {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id            TEXT PRIMARY KEY,
      host_id       TEXT,
      host_name     TEXT,
      title         TEXT NOT NULL,
      description   TEXT,
      category      TEXT,
      location_hint TEXT,
      proposed_date TEXT,
      date_flexible INTEGER DEFAULT 0,
      status        TEXT DEFAULT 'open',
      slug          TEXT UNIQUE,
      template_id   TEXT,
      plan_version  INTEGER DEFAULT 1,
      rsvp_deadline TEXT,
      vote_deadline TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id            TEXT PRIMARY KEY,
      event_id      TEXT NOT NULL,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL,
      status        TEXT DEFAULT 'pending',
      invite_token  TEXT UNIQUE,
      slug          TEXT UNIQUE,
      user_id       TEXT,
      responded_at  TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS preferences (
      id             TEXT PRIMARY KEY,
      invitation_id  TEXT UNIQUE NOT NULL,
      event_id       TEXT NOT NULL,
      dietary        TEXT,
      cuisine_prefs  TEXT,
      cuisine_avoid  TEXT,
      budget_min     INTEGER,
      budget_max     INTEGER,
      location_pref  TEXT,
      availability   TEXT,
      vibe_pref      TEXT,
      notes          TEXT,
      created_at     TEXT DEFAULT (datetime('now')),
      updated_at     TEXT,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id               TEXT PRIMARY KEY,
      event_id         TEXT NOT NULL,
      rank             INTEGER NOT NULL,
      restaurant_name  TEXT NOT NULL,
      restaurant_addr  TEXT,
      cuisine_type     TEXT,
      price_range      TEXT,
      rating           REAL,
      image_url        TEXT,
      maps_url         TEXT,
      booking_url      TEXT,
      reasoning        TEXT,
      constraints_met  TEXT,
      constraints_gap  TEXT,
      suggested_time   TEXT,
      envy_scores      TEXT,
      narrative_group  TEXT,
      narrative_personal TEXT,
      confidence_score REAL,
      version            INTEGER DEFAULT 1,
      parent_version     INTEGER,
      modification_summary TEXT,
      created_at       TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      proposal_id    TEXT NOT NULL,
      invitation_id  TEXT NOT NULL,
      rank           INTEGER NOT NULL,
      created_at     TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (proposal_id, invitation_id),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id),
      FOREIGN KEY (invitation_id) REFERENCES invitations(id)
    );

    CREATE TABLE IF NOT EXISTS finalized_plans (
      id             TEXT PRIMARY KEY,
      event_id       TEXT UNIQUE NOT NULL,
      proposal_id    TEXT NOT NULL,
      confirmed_time TEXT NOT NULL,
      notes          TEXT,
      calendar_data  TEXT,
      created_at     TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id)
    );

    CREATE TABLE IF NOT EXISTS modification_suggestions (
      id               TEXT PRIMARY KEY,
      event_id         TEXT NOT NULL,
      invitation_id    TEXT NOT NULL,
      feedback_text    TEXT NOT NULL,
      intent_type      TEXT,
      intent_confidence REAL,
      affected_scope   TEXT,
      ai_interpretation TEXT,
      status           TEXT DEFAULT 'pending',
      reviewed_by      TEXT,
      reviewed_at      TEXT,
      created_at       TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (invitation_id) REFERENCES invitations(id)
    );

    CREATE TABLE IF NOT EXISTS usage_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id      TEXT,
      kind          TEXT NOT NULL,
      provider      TEXT,
      model         TEXT,
      input_tokens  INTEGER,
      output_tokens INTEGER,
      cost_micros   INTEGER DEFAULT 0,
      request_count INTEGER DEFAULT 1,
      metadata      TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS feature_flags (
      flag_name TEXT PRIMARY KEY,
      enabled   INTEGER DEFAULT 0,
      user_ids  TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS funnel_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name  TEXT NOT NULL,
      user_id     TEXT,
      session_id  TEXT,
      metadata    TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function randomHex8(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function nowISO(): string {
  return new Date().toISOString();
}

/** Parse JSON text columns on read, store as JSON string on write. */
function parseJson<T>(val: unknown): T | null {
  if (!val) return null;
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return null; }
  }
  return val as T;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export function getEventBySlug(slug: string): DbResult<DbRow<GroupEvent> | null> {
  const d = getDb();
  const row = d.prepare('SELECT * FROM events WHERE slug = ?').get(slug) as Record<string, unknown> | undefined;
  return typedRow<GroupEvent>(row);
}

export function getEventById(id: string): DbResult<DbRow<GroupEvent> | null> {
  const d = getDb();
  const row = d.prepare('SELECT * FROM events WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return typedRow<GroupEvent>(row);
}

export function getEventsByHost(hostId: string): DbResult<Array<DbRow<GroupEvent>>> {
  const d = getDb();
  const rows = d.prepare('SELECT * FROM events WHERE host_id = ? ORDER BY created_at DESC').all(hostId) as Record<string, unknown>[];
  return { data: rows as Array<DbRow<GroupEvent>>, error: null };
}

export function createEvent(hostId: string, input: Record<string, unknown>, slug: string) {
  const d = getDb();
  const id = crypto.randomUUID();
  const now = nowISO();
  d.prepare(`
    INSERT INTO events (id, host_id, title, description, category, location_hint, proposed_date, date_flexible, status, slug, template_id, plan_version, rsvp_deadline, vote_deadline, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, hostId,
    input.title ?? null, input.description ?? null, input.category ?? null,
    input.location_hint ?? null, input.proposed_date ?? null,
    input.date_flexible ? 1 : 0, 'open', slug,
    input.template_id ?? null, 1, input.rsvp_deadline ?? null, input.vote_deadline ?? null, now,
  );
  const row = d.prepare('SELECT * FROM events WHERE id = ?').get(id) as Record<string, unknown>;
  return { data: row, error: null };
}

export function updateEvent(id: string, input: Record<string, unknown>) {
  const d = getDb();
  const fields: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      vals.push(k === 'date_flexible' ? (v ? 1 : 0) : v);
    }
  }
  if (fields.length === 0) {
    const row = d.prepare('SELECT * FROM events WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return { data: row ?? null, error: row ? null : { message: 'No fields to update' } };
  }
  vals.push(id);
  d.prepare(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  const row = d.prepare('SELECT * FROM events WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return { data: row ?? null, error: row ? null : { message: 'Not found' } };
}

export function updateEventStatus(id: string, status: string) {
  const d = getDb();
  d.prepare('UPDATE events SET status = ? WHERE id = ?').run(status, id);
  const row = d.prepare('SELECT * FROM events WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return { data: row ?? null, error: row ? null : { message: 'Not found' } };
}

export function deleteEvent(id: string) {
  const d = getDb();
  d.prepare('DELETE FROM events WHERE id = ?').run(id);
  return { error: null };
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------
export function getInvitationByToken(token: string): DbResult<DbRow<Invitation> | null> {
  const d = getDb();
  const row = d.prepare('SELECT * FROM invitations WHERE invite_token = ?').get(token) as Record<string, unknown> | undefined;
  return typedRow<Invitation>(row);
}

export function getInvitationBySlug(slug: string): DbResult<DbRow<Invitation> | null> {
  const d = getDb();
  const row = d.prepare('SELECT * FROM invitations WHERE slug = ?').get(slug) as Record<string, unknown> | undefined;
  return typedRow<Invitation>(row);
}

export function getInvitationsByEvent(eventId: string): DbResult<Array<DbRow<Invitation>>> {
  const d = getDb();
  const rows = d.prepare('SELECT * FROM invitations WHERE event_id = ? ORDER BY created_at ASC').all(eventId) as Record<string, unknown>[];
  return { data: rows as Array<DbRow<Invitation>>, error: null };
}

export function createInvitations(invitations: Array<{ event_id: string; event_slug: string; name: string; email: string }>) {
  const d = getDb();
  const now = nowISO();
  const inserted: Record<string, unknown>[] = [];
  const insert = d.prepare('INSERT INTO invitations (id, event_id, name, email, status, invite_token, slug, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const txn = d.transaction(() => {
    for (const inv of invitations) {
      const id = crypto.randomUUID();
      const inviteToken = crypto.randomUUID().replace(/-/g, '');
      const invSlug = `${inv.event_slug}-${randomHex8()}`;
      insert.run(id, inv.event_id, inv.name, inv.email, 'pending', inviteToken, invSlug, now);
      const row = d.prepare('SELECT * FROM invitations WHERE id = ?').get(id) as Record<string, unknown>;
      inserted.push(row);
    }
  });
  txn();
  return { data: inserted, error: null };
}

export function updateInvitationStatus(token: string, status: 'accepted' | 'declined', name?: string) {
  const d = getDb();
  const now = nowISO();
  if (name !== undefined) {
    d.prepare('UPDATE invitations SET status = ?, responded_at = ?, name = ? WHERE invite_token = ?').run(status, now, name, token);
  } else {
    d.prepare('UPDATE invitations SET status = ?, responded_at = ? WHERE invite_token = ?').run(status, now, token);
  }
  const row = d.prepare('SELECT * FROM invitations WHERE invite_token = ?').get(token) as Record<string, unknown> | undefined;
  return { data: row ?? null, error: row ? null : { message: 'Not found' } };
}

export function linkInvitationToUser(invitationId: string, userId: string) {
  const d = getDb();
  d.prepare('UPDATE invitations SET user_id = ? WHERE id = ?').run(userId, invitationId);
  const row = d.prepare('SELECT * FROM invitations WHERE id = ?').get(invitationId) as Record<string, unknown> | undefined;
  return { data: row ?? null, error: row ? null : { message: 'Not found' } };
}

// ---------------------------------------------------------------------------
// Preferences (was guest_preferences in Supabase)
// ---------------------------------------------------------------------------
export function getPreferencesByEvent(eventId: string): DbResult<Array<DbRow<GuestPreferences>>> {
  const d = getDb();
  const rows = d.prepare('SELECT * FROM preferences WHERE event_id = ?').all(eventId) as Record<string, unknown>[];
  return { data: rows as Array<DbRow<GuestPreferences>>, error: null };
}

export function getPreferencesByInvitation(invitationId: string): DbResult<DbRow<GuestPreferences> | null> {
  const d = getDb();
  const row = d.prepare('SELECT * FROM preferences WHERE invitation_id = ?').get(invitationId) as Record<string, unknown> | undefined;
  return { data: (row as DbRow<GuestPreferences> | undefined) ?? null, error: null };
}

export function upsertPreferences(
  invitationId: string,
  eventId: string,
  input: Record<string, unknown>,
) {
  const d = getDb();
  const now = nowISO();
  const id = crypto.randomUUID();
  // SQLite UPSERT
  d.prepare(`
    INSERT INTO preferences (id, invitation_id, event_id, dietary, cuisine_prefs, cuisine_avoid, budget_min, budget_max, location_pref, availability, vibe_pref, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(invitation_id) DO UPDATE SET
      dietary = excluded.dietary,
      cuisine_prefs = excluded.cuisine_prefs,
      cuisine_avoid = excluded.cuisine_avoid,
      budget_min = excluded.budget_min,
      budget_max = excluded.budget_max,
      location_pref = excluded.location_pref,
      availability = excluded.availability,
      vibe_pref = excluded.vibe_pref,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(
    id, invitationId, eventId,
    input.dietary ? JSON.stringify(input.dietary) : null,
    input.cuisine_prefs ? JSON.stringify(input.cuisine_prefs) : null,
    input.cuisine_avoid ? JSON.stringify(input.cuisine_avoid) : null,
    input.budget_min ?? null, input.budget_max ?? null,
    input.location_pref ?? null,
    input.availability ? JSON.stringify(input.availability) : null,
    input.vibe_pref ?? null, input.notes ?? null,
    now, now,
  );
  const row = d.prepare('SELECT * FROM preferences WHERE invitation_id = ?').get(invitationId) as Record<string, unknown>;
  return { data: row, error: null };
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------
export interface InsertProposalRow {
  event_id: string;
  rank: number;
  restaurant_name: string;
  restaurant_addr: string;
  cuisine_type: string;
  price_range: string;
  rating?: number;
  image_url?: string | null;
  maps_url?: string | null;
  booking_url?: string | null;
  reasoning: string;
  constraints_met: Record<string, boolean>;
  constraints_gap: Record<string, string>;
  suggested_time?: string | null;
  envy_scores?: Record<string, number> | null;
  narrative_group?: string | null;
  narrative_personal?: Record<string, string> | null;
  confidence_score?: number | null;
}

export function getProposalsByEvent(eventId: string): DbResult<Array<DbRow<Proposal>>> {
  const d = getDb();
  const rows = d.prepare('SELECT * FROM proposals WHERE event_id = ? ORDER BY rank ASC').all(eventId) as Record<string, unknown>[];
  return { data: rows as Array<DbRow<Proposal>>, error: null };
}

export function insertProposals(rows: InsertProposalRow[]) {
  const d = getDb();
  const now = nowISO();
  const inserted: Record<string, unknown>[] = [];
  const txn = d.transaction(() => {
    for (const r of rows) {
      const id = crypto.randomUUID();
      d.prepare(`
        INSERT INTO proposals (id, event_id, rank, restaurant_name, restaurant_addr, cuisine_type, price_range, rating, image_url, maps_url, booking_url, reasoning, constraints_met, constraints_gap, suggested_time, envy_scores, narrative_group, narrative_personal, confidence_score, version, parent_version, modification_summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, r.event_id, r.rank, r.restaurant_name, r.restaurant_addr, r.cuisine_type,
        r.price_range, r.rating ?? null, r.image_url ?? null, r.maps_url ?? null,
        r.booking_url ?? null, r.reasoning,
        JSON.stringify(r.constraints_met), JSON.stringify(r.constraints_gap),
        r.suggested_time ?? null,
        r.envy_scores ? JSON.stringify(r.envy_scores) : null,
        r.narrative_group ?? null,
        r.narrative_personal ? JSON.stringify(r.narrative_personal) : null,
        r.confidence_score ?? null, 1, null, null, now,
      );
      const row = d.prepare('SELECT * FROM proposals WHERE id = ?').get(id) as Record<string, unknown>;
      inserted.push(row);
    }
  });
  txn();
  return { data: inserted, error: null };
}

/**
 * Replaces proposals for an event and advances status from `collecting` -> `deciding`.
 * Mirrors the Supabase RPC `replace_proposals_and_advance`.
 */
export function replaceProposalsAndAdvance(eventId: string, rows: InsertProposalRow[]) {
  const d = getDb();
  const txn = d.transaction(() => {
    d.prepare('DELETE FROM votes WHERE proposal_id IN (SELECT id FROM proposals WHERE event_id = ?)').run(eventId);
    d.prepare('DELETE FROM proposals WHERE event_id = ?').run(eventId);
    d.prepare("UPDATE events SET status = 'deciding' WHERE id = ?").run(eventId);
    const now = nowISO();
    for (const r of rows) {
      const id = crypto.randomUUID();
      d.prepare(`
        INSERT INTO proposals (id, event_id, rank, restaurant_name, restaurant_addr, cuisine_type, price_range, rating, image_url, maps_url, booking_url, reasoning, constraints_met, constraints_gap, suggested_time, envy_scores, narrative_group, narrative_personal, confidence_score, version, parent_version, modification_summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, r.event_id, r.rank, r.restaurant_name, r.restaurant_addr, r.cuisine_type,
        r.price_range, r.rating ?? null, r.image_url ?? null, r.maps_url ?? null,
        r.booking_url ?? null, r.reasoning,
        JSON.stringify(r.constraints_met), JSON.stringify(r.constraints_gap),
        r.suggested_time ?? null,
        r.envy_scores ? JSON.stringify(r.envy_scores) : null,
        r.narrative_group ?? null,
        r.narrative_personal ? JSON.stringify(r.narrative_personal) : null,
        r.confidence_score ?? null, 1, null, null, now,
      );
    }
  });
  txn();
  return { error: null };
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------
export function getVotesByEvent(eventId: string): DbResult<Array<DbRow<Vote>>> {
  const d = getDb();
  const rows = d.prepare(`
    SELECT v.* FROM votes v
    INNER JOIN proposals p ON p.id = v.proposal_id
    WHERE p.event_id = ?
  `).all(eventId) as Record<string, unknown>[];
  return { data: rows as Array<DbRow<Vote>>, error: null };
}

export function getVotesByInvitation(invitationId: string): DbResult<Array<DbRow<Vote>>> {
  const d = getDb();
  const rows = d.prepare('SELECT * FROM votes WHERE invitation_id = ?').all(invitationId) as Record<string, unknown>[];
  return { data: rows as Array<DbRow<Vote>>, error: null };
}

export function upsertVote(proposalId: string, invitationId: string, rank: number) {
  const d = getDb();
  d.prepare(`
    INSERT INTO votes (proposal_id, invitation_id, rank) VALUES (?, ?, ?)
    ON CONFLICT(proposal_id, invitation_id) DO UPDATE SET rank = excluded.rank
  `).run(proposalId, invitationId, rank);
  const row = d.prepare('SELECT * FROM votes WHERE proposal_id = ? AND invitation_id = ?').get(proposalId, invitationId) as Record<string, unknown> | undefined;
  return { data: row ?? null, error: row ? null : { message: 'Vote not found after upsert' } };
}

// ---------------------------------------------------------------------------
// Finalized Plans
// ---------------------------------------------------------------------------
export function getFinalizedPlanByEvent(eventId: string): DbResult<DbRow<FinalizedPlan> | null> {
  const d = getDb();
  const row = d.prepare('SELECT * FROM finalized_plans WHERE event_id = ? ORDER BY created_at DESC LIMIT 1').get(eventId) as Record<string, unknown> | undefined;
  return typedRow<FinalizedPlan>(row);
}

// ---------------------------------------------------------------------------
// Modification Suggestions
// ---------------------------------------------------------------------------
export interface InsertModificationSuggestion {
  event_id: string;
  invitation_id: string;
  feedback_text: string;
  intent_type?: string | null;
  intent_confidence?: number | null;
  affected_scope?: string | null;
  ai_interpretation?: string | null;
  status?: string;
}

export function insertModificationSuggestion(input: InsertModificationSuggestion) {
  const d = getDb();
  const id = crypto.randomUUID();
  const now = nowISO();
  d.prepare(`
    INSERT INTO modification_suggestions (id, event_id, invitation_id, feedback_text, intent_type, intent_confidence, affected_scope, ai_interpretation, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.event_id, input.invitation_id, input.feedback_text,
    input.intent_type ?? null, input.intent_confidence ?? null,
    input.affected_scope ?? null, input.ai_interpretation ?? null,
    input.status ?? 'pending', now,
  );
  const row = d.prepare('SELECT * FROM modification_suggestions WHERE id = ?').get(id) as Record<string, unknown>;
  return { data: row, error: null };
}

export function getModificationSuggestionsByEvent(eventId: string, opts?: { status?: string }) {
  const d = getDb();
  let rows: Record<string, unknown>[];
  if (opts?.status) {
    rows = d.prepare('SELECT * FROM modification_suggestions WHERE event_id = ? AND status = ? ORDER BY created_at ASC').all(eventId, opts.status) as Record<string, unknown>[];
  } else {
    rows = d.prepare('SELECT * FROM modification_suggestions WHERE event_id = ? ORDER BY created_at ASC').all(eventId) as Record<string, unknown>[];
  }
  return { data: rows, error: null };
}

export function updateModificationSuggestionStatus(id: string, status: string, reviewedBy?: string) {
  const d = getDb();
  const now = nowISO();
  if (reviewedBy) {
    d.prepare('UPDATE modification_suggestions SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?').run(status, reviewedBy, now, id);
  } else {
    d.prepare('UPDATE modification_suggestions SET status = ? WHERE id = ?').run(status, id);
  }
  const row = d.prepare('SELECT * FROM modification_suggestions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return { data: row ?? null, error: row ? null : { message: 'Not found' } };
}

export function bumpPlanVersion(eventId: string) {
  const d = getDb();
  const result = d.prepare('UPDATE events SET plan_version = plan_version + 1 WHERE id = ?').run(eventId);
  if (result.changes === 0) {
    return { data: null, error: { message: 'Not found' } };
  }
  const row = d.prepare('SELECT plan_version FROM events WHERE id = ?').get(eventId) as { plan_version: number } | undefined;
  return { data: row!.plan_version, error: null };
}

export function getPlanVersion(eventId: string): { data: number | null; error: null } {
  const d = getDb();
  const row = d.prepare('SELECT plan_version FROM events WHERE id = ?').get(eventId) as { plan_version: number } | undefined;
  return { data: row?.plan_version ?? null, error: null };
}

export interface ModificationVersion {
  version: number;
  created_at: string;
  modification_summary: string | null;
}

export function getModificationHistory(eventId: string) {
  const d = getDb();
  const rows = d.prepare(
    'SELECT version, MAX(created_at) as created_at, modification_summary FROM proposals WHERE event_id = ? GROUP BY version ORDER BY version DESC',
  ).all(eventId) as Array<{ version: number; created_at: string; modification_summary: string | null }>;
  return { data: rows, error: null };
}

// ---------------------------------------------------------------------------
// Usage Log
// ---------------------------------------------------------------------------
export type UsageKind = 'ai_synthesis' | 'venue_search' | 'photo_proxy';

export interface InsertUsageRow {
  event_id?: string | null;
  kind: UsageKind;
  provider: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_micros: number;
  request_count?: number;
  metadata?: Record<string, unknown>;
}

export function logUsage(row: InsertUsageRow) {
  const d = getDb();
  d.prepare(`
    INSERT INTO usage_log (event_id, kind, provider, model, input_tokens, output_tokens, cost_micros, request_count, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    row.event_id ?? null,
    row.kind, row.provider, row.model ?? null,
    row.input_tokens ?? null, row.output_tokens ?? null,
    row.cost_micros, row.request_count ?? 1,
    row.metadata ? JSON.stringify(row.metadata) : null,
  );
  return { error: null };
}

export function getUsageByEvent(eventId: string) {
  const d = getDb();
  const rows = d.prepare('SELECT * FROM usage_log WHERE event_id = ? ORDER BY created_at DESC').all(eventId) as Record<string, unknown>[];
  return { data: rows, error: null };
}

// ---------------------------------------------------------------------------
// AI Logs (for pipeline v2 cost tracking)
// ---------------------------------------------------------------------------
export function getMonthlySpendByEvent(eventId: string): number {
  const d = getDb();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const rows = d.prepare(
    'SELECT cost_micros FROM usage_log WHERE event_id = ? AND kind = ? AND created_at >= ?',
  ).all(eventId, 'ai_synthesis', startOfMonth.toISOString()) as Array<{ cost_micros: number }>;
  return rows.reduce((sum, r) => sum + (r.cost_micros ?? 0), 0);
}

export function getSpendSince(eventId: string, since: Date): number {
  const d = getDb();
  const rows = d.prepare(
    'SELECT cost_micros FROM usage_log WHERE event_id = ? AND kind = ? AND created_at >= ?',
  ).all(eventId, 'ai_synthesis', since.toISOString()) as Array<{ cost_micros: number }>;
  return rows.reduce((sum, r) => sum + (r.cost_micros ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Feature Flags
// ---------------------------------------------------------------------------
export function getFlag(flagName: string, userId?: string | null): boolean {
  const d = getDb();
  const row = d.prepare('SELECT enabled, user_ids FROM feature_flags WHERE flag_name = ?').get(flagName) as { enabled: number; user_ids: string } | undefined;
  if (!row) return false;
  if (row.enabled) return true;
  if (userId) {
    const ids: string[] = JSON.parse(row.user_ids || '[]');
    if (ids.includes(userId)) return true;
  }
  return false;
}

export function getAllFlags() {
  const d = getDb();
  const rows = d.prepare('SELECT * FROM feature_flags ORDER BY flag_name').all() as Record<string, unknown>[];
  return { data: rows, error: null };
}

// ---------------------------------------------------------------------------
// Funnel
// ---------------------------------------------------------------------------
export function trackFunnelEvent(payload: {
  event_name: string;
  user_id?: string | null;
  session_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const d = getDb();
  d.prepare(`
    INSERT INTO funnel_events (event_name, user_id, session_id, metadata)
    VALUES (?, ?, ?, ?)
  `).run(
    payload.event_name,
    payload.user_id ?? null,
    payload.session_id ?? null,
    payload.metadata ? JSON.stringify(payload.metadata) : null,
  );
  return { error: null };
}

export function getFunnelEvents(opts: { event_name?: string; limit?: number } = {}) {
  const d = getDb();
  let sql = 'SELECT * FROM funnel_events';
  const params: unknown[] = [];
  if (opts.event_name) {
    sql += ' WHERE event_name = ?';
    params.push(opts.event_name);
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(opts.limit ?? 500);
  const rows = d.prepare(sql).all(...params) as Record<string, unknown>[];
  return { data: rows, error: null };
}

// Stub: getAiLogsByEvent / getRecentAiLogs (pipeline v2 debug pages)
export function getAiLogsByEvent(_eventId: string) {
  return { data: [], error: null };
}
export function getRecentAiLogs(_opts: { limit?: number; stage?: string } = {}) {
  return { data: [], error: null };
}

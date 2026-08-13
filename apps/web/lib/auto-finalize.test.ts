import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
  getProposalsByEvent: vi.fn(),
  getVotesByEvent: vi.fn(),
  getInvitationsByEvent: vi.fn(),
}));
vi.mock('@/lib/notifications', () => ({
  getNotificationService: vi.fn(),
  sendBatch: vi.fn().mockResolvedValue({ sent: 1, failed: 0, errors: [] }),
  appUrl: vi.fn().mockReturnValue('http://localhost:3000'),
}));

import { maybeAutoFinalize } from './auto-finalize';
import {
  getDb,
  getInvitationsByEvent,
  getProposalsByEvent,
  getVotesByEvent,
} from '@/lib/db';
import { getNotificationService, sendBatch } from '@/lib/notifications';

const EVENT_ID = 'event-1';
const WINNER_ID = 'proposal-1';

const BASE_EVENT = {
  id: EVENT_ID,
  title: 'Team Dinner',
  status: 'deciding',
  vote_deadline: new Date(Date.now() - 60_000).toISOString(),
  proposed_date: '2026-07-01T19:00:00.000Z',
};

const PROPOSALS = [
  { id: WINNER_ID, restaurant_name: 'Sushi Spot', restaurant_addr: '1 Main St', suggested_time: null },
  { id: 'proposal-2', restaurant_name: 'Pizza Place', restaurant_addr: '2 Elm St', suggested_time: null },
];

const VOTES = [
  { proposal_id: WINNER_ID, invitation_id: 'inv-1', rank: 1 },
  { proposal_id: 'proposal-2', invitation_id: 'inv-1', rank: 2 },
];

const INVITATIONS = [
  { id: 'inv-1', name: 'Alice', email: 'alice@example.com', status: 'accepted' },
  { id: 'inv-2', name: 'Bob', email: 'bob@example.com', status: 'pending' },
];

function makeDb(options: { event?: object | null; flipChanges?: number } = {}) {
  const event = options.event === undefined ? BASE_EVENT : options.event;
  const insertRun = vi.fn().mockReturnValue({ changes: 1 });
  const updateRun = vi.fn().mockReturnValue({ changes: options.flipChanges ?? 1 });
  const prepare = vi.fn((sql: string) => {
    if (sql.includes('SELECT id, title, status')) {
      return { get: vi.fn().mockReturnValue(event) };
    }
    if (sql.includes("UPDATE events SET status = 'finalized'")) {
      return { run: updateRun };
    }
    if (sql.includes('INSERT INTO finalized_plans')) {
      return { run: insertRun };
    }
    throw new Error(`Unexpected SQL in test: ${sql}`);
  });

  return { prepare, insertRun, updateRun };
}

describe('maybeAutoFinalize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockReturnValue(makeDb() as never);
    vi.mocked(getProposalsByEvent).mockReturnValue({ data: PROPOSALS } as never);
    vi.mocked(getVotesByEvent).mockReturnValue({ data: VOTES } as never);
    vi.mocked(getInvitationsByEvent).mockReturnValue({ data: INVITATIONS } as never);
    vi.mocked(getNotificationService).mockReturnValue({ notify: vi.fn() });
  });

  it('returns false when event is not found', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb({ event: null }) as never);
    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when event status is not deciding', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb({ event: { ...BASE_EVENT, status: 'open' } }) as never);
    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when vote_deadline is null', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb({ event: { ...BASE_EVENT, vote_deadline: null } }) as never);
    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when vote_deadline is in the future', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb({
      event: { ...BASE_EVENT, vote_deadline: new Date(Date.now() + 60_000).toISOString() },
    }) as never);
    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when there are no proposals', async () => {
    vi.mocked(getProposalsByEvent).mockReturnValueOnce({ data: [] } as never);
    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when all Borda scores are zero', async () => {
    vi.mocked(getVotesByEvent).mockReturnValueOnce({ data: [] } as never);
    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when no confirmed time is available', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb({ event: { ...BASE_EVENT, proposed_date: null } }) as never);
    vi.mocked(getProposalsByEvent).mockReturnValue({
      data: PROPOSALS.map((proposal) => ({ ...proposal, suggested_time: null })),
    } as never);
    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when the concurrent-write guard fails', async () => {
    vi.mocked(getDb).mockReturnValue(makeDb({ flipChanges: 0 }) as never);
    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('inserts the finalized plan with calendar data', async () => {
    const db = makeDb();
    vi.mocked(getDb).mockReturnValue(db as never);

    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(true);
    expect(db.insertRun).toHaveBeenCalledOnce();

    const [, eventId, proposalId, confirmedTime, notes, calendarJson] = db.insertRun.mock.calls[0]!;
    expect(eventId).toBe(EVENT_ID);
    expect(proposalId).toBe(WINNER_ID);
    expect(confirmedTime).toBe(BASE_EVENT.proposed_date);
    expect(notes).toContain('Auto-finalized');
    expect(JSON.parse(calendarJson as string)).toMatchObject({
      title: BASE_EVENT.title,
      location: PROPOSALS[0]!.restaurant_addr,
      attendees: [{ name: 'Alice', email: 'alice@example.com' }],
    });
  });

  it('sends winner emails to accepted invitees only', async () => {
    await maybeAutoFinalize(EVENT_ID);

    expect(sendBatch).toHaveBeenCalledOnce();
    const messages = vi.mocked(sendBatch).mock.calls[0]![1];
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      to: { name: 'Alice', email: 'alice@example.com' },
      template: 'winner-announced',
    });
  });

  it('skips notifications when no service is configured', async () => {
    vi.mocked(getNotificationService).mockReturnValueOnce(null);
    await maybeAutoFinalize(EVENT_ID);
    expect(sendBatch).not.toHaveBeenCalled();
  });

  it('selects the highest Borda score winner', async () => {
    const db = makeDb();
    vi.mocked(getDb).mockReturnValue(db as never);
    vi.mocked(getVotesByEvent).mockReturnValueOnce({
      data: [
        { proposal_id: 'proposal-2', invitation_id: 'inv-1', rank: 1 },
        { proposal_id: WINNER_ID, invitation_id: 'inv-1', rank: 2 },
      ],
    } as never);

    await maybeAutoFinalize(EVENT_ID);
    expect(db.insertRun.mock.calls[0]![2]).toBe('proposal-2');
  });
});

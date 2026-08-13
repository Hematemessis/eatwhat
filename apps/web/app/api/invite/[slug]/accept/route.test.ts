import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
  getEventById: vi.fn(),
  getInvitationBySlug: vi.fn(),
  getInvitationByToken: vi.fn(),
}));

import { POST } from './route';
import { getDb, getEventById, getInvitationBySlug, getInvitationByToken } from '@/lib/db';

function makeDb() {
  const run = vi.fn().mockReturnValue({ changes: 1 });
  const prepare = vi.fn().mockReturnValue({ run });
  return { prepare, run };
}

const INVITATION = {
  id: 'inv-1',
  event_id: 'event-1',
  slug: 'team-dinner-abcd1234',
  status: 'pending',
};

describe('POST /api/invite/[slug]/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockReturnValue(makeDb() as never);
    vi.mocked(getEventById).mockReturnValue({
      data: { status: 'collecting', rsvp_deadline: new Date(Date.now() + 86_400_000).toISOString() },
    } as never);
    vi.mocked(getInvitationBySlug).mockReturnValue({ data: INVITATION } as never);
    vi.mocked(getInvitationByToken).mockReturnValue({ data: null } as never);
  });

  it('returns 404 when the invitation is not found', async () => {
    vi.mocked(getInvitationBySlug).mockReturnValueOnce({ data: null } as never);

    const response = await POST(new NextRequest('http://localhost/api/invite/missing/accept'), {
      params: Promise.resolve({ slug: 'missing' }),
    });

    await expect(response.json()).resolves.toEqual({ error: 'Not found' });
    expect(response.status).toBe(404);
    expect(getDb).not.toHaveBeenCalled();
  });

  it('accepts a pending invitation and redirects', async () => {
    const db = makeDb();
    vi.mocked(getDb).mockReturnValue(db as never);

    const response = await POST(new NextRequest('http://localhost/api/invite/team-dinner-abcd1234/accept'), {
      params: Promise.resolve({ slug: 'team-dinner-abcd1234' }),
    });

    await expect(response.json()).resolves.toEqual({ redirect: '/invite/team-dinner-abcd1234/confirmed' });
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("SET status = 'accepted'"));
    expect(db.run).toHaveBeenCalledWith(expect.any(String), 'inv-1');
  });

  it('redirects an already accepted invitation without writing again', async () => {
    vi.mocked(getInvitationBySlug).mockReturnValueOnce({
      data: { ...INVITATION, status: 'accepted' },
    } as never);

    const response = await POST(new NextRequest('http://localhost/api/invite/team-dinner-abcd1234/accept'), {
      params: Promise.resolve({ slug: 'team-dinner-abcd1234' }),
    });

    await expect(response.json()).resolves.toEqual({ redirect: '/invite/team-dinner-abcd1234/confirmed' });
    expect(getDb).not.toHaveBeenCalled();
  });

  it('accepts legacy token links and redirects to the canonical slug', async () => {
    const legacyToken = 'a'.repeat(64);
    vi.mocked(getInvitationByToken).mockReturnValueOnce({ data: INVITATION } as never);

    const response = await POST(new NextRequest(`http://localhost/api/invite/${legacyToken}/accept`), {
      params: Promise.resolve({ slug: legacyToken }),
    });

    await expect(response.json()).resolves.toEqual({ redirect: '/invite/team-dinner-abcd1234/confirmed' });
    expect(getInvitationByToken).toHaveBeenCalledWith(legacyToken);
    expect(getInvitationBySlug).not.toHaveBeenCalled();
  });

  it('rejects pending accepts after the RSVP deadline', async () => {
    vi.mocked(getEventById).mockReturnValueOnce({
      data: { status: 'collecting', rsvp_deadline: new Date(Date.now() - 86_400_000).toISOString() },
    } as never);

    const response = await POST(new NextRequest('http://localhost/api/invite/team-dinner-abcd1234/accept'), {
      params: Promise.resolve({ slug: 'team-dinner-abcd1234' }),
    });

    await expect(response.json()).resolves.toEqual({ error: 'RSVP deadline has passed' });
    expect(response.status).toBe(422);
    expect(getDb).not.toHaveBeenCalled();
  });

  it('rejects pending accepts when the event is no longer collecting RSVPs', async () => {
    vi.mocked(getEventById).mockReturnValueOnce({
      data: { status: 'finalized', rsvp_deadline: new Date(Date.now() + 86_400_000).toISOString() },
    } as never);

    const response = await POST(new NextRequest('http://localhost/api/invite/team-dinner-abcd1234/accept'), {
      params: Promise.resolve({ slug: 'team-dinner-abcd1234' }),
    });

    await expect(response.json()).resolves.toEqual({
      error: 'RSVPs are no longer being accepted for this event',
    });
    expect(response.status).toBe(422);
    expect(getDb).not.toHaveBeenCalled();
  });
});

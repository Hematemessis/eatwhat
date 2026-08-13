import { getProposalsByEvent, getVotesByEvent, getInvitationsByEvent, getDb } from '@/lib/db';
import { getNotificationService, sendBatch, appUrl } from '@/lib/notifications';
import { computeBorda, DINNER_DURATION_MS } from '@/lib/scoring';

// Check-on-read auto-finalize: when an event in `deciding` has passed its
// vote_deadline, lock in the current Borda winner. Idempotent — safe to call
// from any read path. Returns true if it actually finalized.
export async function maybeAutoFinalize(eventId: string): Promise<boolean> {
  const db = getDb();

  const event = db.prepare(
    'SELECT id, title, status, vote_deadline, proposed_date FROM events WHERE id = ?',
  ).get(eventId) as Record<string, unknown> | undefined;

  if (!event) return false;
  if (event.status !== 'deciding') return false;
  if (!event.vote_deadline) return false;
  if (new Date(event.vote_deadline as string).getTime() > Date.now()) return false;

  const [{ data: proposals }, { data: votes }] = [
    getProposalsByEvent(eventId),
    getVotesByEvent(eventId),
  ];

  if (!(proposals as unknown[])?.length) return false;

  const { tally } = computeBorda(
    (proposals as Array<{ id: string }>).map((p) => p.id),
    (votes ?? []) as Array<{ proposal_id: string; invitation_id: string; rank: number }>,
  );
  const scoreById = new Map(tally.map((t) => [t.proposal_id, t.weighted_score]));

  const proposalsArr = proposals as Array<Record<string, unknown>>;
  const winner = [...proposalsArr].sort(
    (a, b) => (scoreById.get(b.id as string) ?? 0) - (scoreById.get(a.id as string) ?? 0),
  )[0];

  if (!winner || (scoreById.get(winner.id as string) ?? 0) === 0) return false;

  const confirmedISO = (event.proposed_date ?? winner.suggested_time ?? null) as string | null;
  if (!confirmedISO) return false;

  const confirmedTime = new Date(confirmedISO);
  const endTime = new Date(confirmedTime.getTime() + DINNER_DURATION_MS);

  const { data: invitations } = getInvitationsByEvent(eventId);
  const attendees = ((invitations ?? []) as Array<{ status: string; name: string; email: string }>)
    .filter((i) => i.status === 'accepted')
    .map((i) => ({ name: i.name, email: i.email }));

  // Belt-and-suspenders against double-finalize
  const flipped = db.prepare(
    "UPDATE events SET status = 'finalized' WHERE id = ? AND status = 'deciding'",
  ).run(eventId);
  if ((flipped as { changes: number }).changes === 0) return false;

  const planId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO finalized_plans (id, event_id, proposal_id, confirmed_time, notes, calendar_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    planId, eventId, winner.id, confirmedTime.toISOString(),
    'Auto-finalized after vote deadline.',
    JSON.stringify({
      title: event.title,
      description: `GroupPlan dinner at ${winner.restaurant_name}`,
      location: winner.restaurant_addr,
      start_time: confirmedTime.toISOString(),
      end_time: endTime.toISOString(),
      attendees,
    }),
  );

  const notifier = getNotificationService();
  if (notifier) {
    const confirmedDisplay = confirmedTime.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
    const accepted = ((invitations ?? []) as Array<{ status: string; name: string; email: string }>).filter((i) => i.status === 'accepted');
    await sendBatch(
      notifier,
      accepted.map((inv) => ({
        to: { name: inv.name, email: inv.email },
        template: 'winner-announced' as const,
        data: {
          event_title: String(event.title ?? ''),
          restaurant_name: String(winner.restaurant_name ?? ''),
          restaurant_addr: String(winner.restaurant_addr ?? ''),
          confirmed_time: confirmedDisplay,
          calendar_url: `${appUrl()}/api/events/${eventId}/calendar`,
        },
      })),
      `auto-finalize event ${eventId}`,
    );
  }

  return true;
}

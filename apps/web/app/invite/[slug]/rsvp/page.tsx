import type { Metadata } from 'next';
import type { InviteStatus } from '@groupplan/types';
import { notFound } from 'next/navigation';
import { getInvitationBySlug, getInvitationByToken, getEventById } from '@/lib/db';
import RSVPForm from '@/components/forms/RSVPForm';

export const metadata: Metadata = { title: 'RSVP' };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function RSVPPage({ params }: Props) {
  const { slug } = await params;

  const { data: invitation } = slug.length === 64
    ? getInvitationByToken(slug)
    : getInvitationBySlug(slug);
  if (!invitation) notFound();

  const inv = invitation as Record<string, unknown>;

  const { data: event } = getEventById(inv.event_id as string);
  if (!event) notFound();

  const evt = event as Record<string, unknown>;

  const deadlinePassed = new Date(evt.rsvp_deadline as string) < new Date();
  const deadlineDisplay = new Date(evt.rsvp_deadline as string).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div className="invite-card-pad" style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', boxShadow: 'var(--sh)', animation: 'fu .35s var(--sp) both' }}>

          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, fontFamily: 'var(--fb)' }}>
            You&apos;re invited
          </div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 30, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.1 }}>
            {evt.title as string}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '0 0 24px' }}>
            Hi {inv.name as string} — please respond by <strong data-testid="rsvp-deadline" style={{ color: 'var(--text)' }}>{deadlineDisplay}</strong>.
          </p>

          {Boolean(evt.description) && (
            <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', lineHeight: 1.55, margin: '0 0 24px', padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--rs)', borderLeft: '2px solid var(--border2)' }}>
              {evt.description as string}
            </p>
          )}

          {deadlinePassed ? (
            <div style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: 'var(--rs)', border: '1px solid var(--border2)' }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0 }}>
                The RSVP deadline has passed.
              </p>
            </div>
          ) : (
            <RSVPForm token={slug} currentStatus={inv.status as InviteStatus} />
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>
          Powered by GroupPlan
        </div>
      </div>
    </main>
  );
}

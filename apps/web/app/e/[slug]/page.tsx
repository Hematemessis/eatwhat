import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEventBySlug, getInvitationsByEvent, getFinalizedPlanByEvent } from '@/lib/db';
import { maybeAutoFinalize } from '@/lib/auto-finalize';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/event-status';
import GuestStatusList from '@/components/realtime/GuestStatusList';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: event } = getEventBySlug(slug);
  return { title: (event as Record<string, unknown> | null)?.title as string ?? 'Event' };
}


export default async function EventStatusPage({ params }: Props) {
  const { slug } = await params;

  const { data: event } = getEventBySlug(slug);
  if (!event) notFound();

  const currentId = (event as Record<string, unknown>).id as string;

  await maybeAutoFinalize(currentId).catch(() => {});

  // Re-fetch event after potential auto-finalize so status is fresh
  const { data: freshEvent } = getEventBySlug(slug);
  const currentEvent = freshEvent ?? event;

  const [{ data: invitations }, { data: finalizedPlan }] = await Promise.all([
    Promise.resolve(getInvitationsByEvent(currentId)),
    currentEvent.status === 'finalized'
      ? Promise.resolve(getFinalizedPlanByEvent(currentId))
      : Promise.resolve({ data: null }),
  ]);

  const plan = finalizedPlan as null | Record<string, unknown>;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px 64px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Event header */}
        <div style={{ marginBottom: 32, animation: 'fu .4s var(--sp) both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '4px 10px', borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border2)', fontSize: 11, fontWeight: 500, color: (STATUS_COLORS as Record<string, string>)[currentEvent.status as string] ?? 'var(--muted)', fontFamily: 'var(--fb)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: (STATUS_COLORS as Record<string, string>)[currentEvent.status as string] ?? 'var(--muted)', display: 'inline-block' }} />
            {String((STATUS_LABELS as Record<string, string>)[currentEvent.status] ?? currentEvent.status)}
          </div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 36, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.05 }}>{currentEvent.title as string}</h1>
          {Boolean(currentEvent.description) && (
            <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0, lineHeight: 1.6 }}>{currentEvent.description as string}</p>
          )}
        </div>

        {/* Finalized restaurant card */}
        {currentEvent.status === 'finalized' && Boolean(plan?.proposals) && (() => {
          const finalized = plan!;
          const venue = finalized.proposals as Record<string, unknown>;
          const confirmedDate = new Date(finalized.confirmed_time as string);
          const dateStr = confirmedDate.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
          return (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', overflow: 'hidden', boxShadow: 'var(--sh)', animation: 'fu .4s var(--sp) .04s both', marginBottom: 24 }}>
              {Boolean(venue.image_url) && (
                <div style={{ height: 160, background: `url(${venue.image_url}) center/cover no-repeat`, borderBottom: '1px solid var(--border2)' }} />
              )}
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'oklch(58% 0.14 228)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10, fontFamily: 'var(--fb)' }}>
                  We&apos;re going here
                </div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: 26, letterSpacing: '-.02em', color: 'var(--text)', lineHeight: 1.1, marginBottom: 4 }}>
                  {venue.restaurant_name as string}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', marginBottom: 16 }}>
                  {String(venue.cuisine_type ?? '')}{venue.price_range ? ` · ${String(venue.price_range)}` : ''}{venue.rating ? ` · ${Number(venue.rating).toFixed(1)}` : ''}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
                      <circle cx="7" cy="6" r="2.5" stroke="var(--muted)" strokeWidth="1.3"/>
                      <path d="M7 1C4.8 1 3 2.8 3 5c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4z" stroke="var(--muted)" strokeWidth="1.3" fill="none"/>
                    </svg>
                    <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', lineHeight: 1.4 }}>{String(venue.restaurant_addr ?? '')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="5.5" stroke="var(--muted)" strokeWidth="1.3"/>
                      <path d="M7 4v3.5l2 2" stroke="var(--muted)" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>{dateStr}</span>
                  </div>
                </div>
                {Boolean(finalized.notes) && (
                  <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '14px 0 0', lineHeight: 1.55, borderTop: '1px solid var(--border2)', paddingTop: 12 }}>{finalized.notes as string}</p>
                )}
                {Boolean(venue.maps_url) && (
                  <a
                    href={venue.maps_url as string}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '8px 16px', borderRadius: 'var(--rs)', background: 'var(--text)', color: 'var(--bg)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--fb)', textDecoration: 'none' }}
                  >
                    Open in Maps
                  </a>
                )}
              </div>
            </div>
          );
        })()}

        {/* Guest status card */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '20px 24px', boxShadow: 'var(--sh)', animation: 'fu .45s var(--sp) .08s both' }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 16, fontFamily: 'var(--fb)' }}>
            Guest status
          </div>
          <GuestStatusList eventId={currentId} initialInvitations={invitations} />
        </div>

        {/* RSVP deadline */}
        {currentEvent.status !== 'finalized' && (
          <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', textAlign: 'center' }}>
            RSVP by <span data-testid="rsvp-deadline">{new Date(currentEvent.rsvp_deadline as string).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </p>
        )}
      </div>
    </main>
  );
}

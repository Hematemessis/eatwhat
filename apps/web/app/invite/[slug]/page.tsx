import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getInvitationByToken, getInvitationBySlug, getEventById, getInvitationsByEvent } from '@/lib/db';
import InviteView from '@/components/invite-templates/InviteView';
import PreviewBanner from '@/components/ui/PreviewBanner';
import AcceptButton from './AcceptButton';

interface Props {
  params: Promise<{ slug: string }>;
}

interface Attendee {
  name: string;
  avatarUrl: string | null;
}

interface AttendeeRow {
  name: string;
  users?: unknown;
}

function formatDate(value: string | null): string {
  if (!value) return 'Date to be confirmed';
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '');
}

function mapAttendees(rows: AttendeeRow[]): Attendee[] {
  return rows.map((row) => {
    const userData = (Array.isArray(row.users) ? row.users[0] : row.users) as unknown;
    const avatarUrl = (userData as { avatar_url?: string | null } | null)?.avatar_url ?? null;
    return { name: row.name, avatarUrl };
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: invitation } = slug.length === 64
    ? getInvitationByToken(slug)
    : getInvitationBySlug(slug);

  if (!invitation) return { title: "You're invited" };

  const inv = invitation as Record<string, unknown>;
  const { data: event } = getEventById(inv.event_id as string);
  return {
    title: event ? `${(event as Record<string, unknown>).title} invitation` : "You're invited",
    description: ((event as Record<string, unknown>)?.description as string) ?? undefined,
  };
}

export default async function InvitePage({ params }: Props) {
  const { slug } = await params;

  const { data: invitation } = slug.length === 64
    ? getInvitationByToken(slug)
    : getInvitationBySlug(slug);
  if (!invitation) notFound();

  const inv = invitation as Record<string, unknown>;

  const { data: event } = getEventById(inv.event_id as string);
  if (!event) notFound();

  const evt = event;

  const { data: attendeeRows } = getInvitationsByEvent(inv.event_id as string);
  const acceptedAttendees = (attendeeRows as Array<Record<string, unknown>> | undefined)?.filter((a) => a.status === 'accepted') ?? [];
  const hostName = 'Your host';
  const attendees = (acceptedAttendees as Array<{ name: string }>).map((a) => ({ name: a.name, avatarUrl: null }));
  const visibleAttendees = attendees.slice(0, 5);
  const extraAttendees = Math.max(0, attendees.length - visibleAttendees.length);
  const dateDisplay = evt.date_flexible ? 'Date flexible' : formatDate(evt.proposed_date as string);
  const locationDisplay = (evt.location_hint as string) ?? 'Location to be confirmed';
  const inviteViewInvitation = { ...invitation, invite_token: slug };

  const isHostPreview = false; // Supabase auth removed
  const evtTemplateId = evt.template_id as string | undefined;

  return (
    <>
      {isHostPreview && <PreviewBanner />}
      <InviteView
        invitation={inviteViewInvitation}
        event={event}
        templateId={evtTemplateId ?? 'classic'}
      />

      <main style={{ background: 'var(--bg)', padding: '36px 24px 60px' }}>
        <section style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 18 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', boxShadow: 'var(--sh)', padding: 24 }}>
            <div className="invite-host-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', fontFamily: 'var(--fb)', fontSize: 13, fontWeight: 700, overflow: 'hidden' }}>
                  {initials(hostName)}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--fb)', marginBottom: 3 }}>
                    Hosted by
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--fb)' }}>
                    {hostName}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', minHeight: 36 }}>
                {visibleAttendees.map((attendee, index) => (
                  <div
                    key={`${attendee.name}-${index}`}
                    title={attendee.name}
                    style={{ width: 36, height: 36, marginLeft: index === 0 ? 0 : -10, borderRadius: '50%', border: '2px solid var(--surface)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', fontFamily: 'var(--fb)', fontSize: 11, fontWeight: 700, overflow: 'hidden' }}
                  >
                    {attendee.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={attendee.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      initials(attendee.name)
                    )}
                  </div>
                ))}
                {extraAttendees > 0 && (
                  <div style={{ width: 36, height: 36, marginLeft: -10, borderRadius: '50%', border: '2px solid var(--surface)', background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'var(--fb)' }}>
                    +{extraAttendees}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 22 }}>
              <span style={{ border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)', borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--fb)' }}>
                {dateDisplay}
              </span>
              <span style={{ border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)', borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--fb)' }}>
                {locationDisplay}
              </span>
            </div>

            {event.description && (
              <div style={{ marginTop: 24, paddingTop: 22, borderTop: '1px solid var(--border2)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--fb)', marginBottom: 8 }}>
                  A note from {hostName}
                </div>
                <p style={{ margin: 0, color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 14, lineHeight: 1.65 }}>
                  {event.description}
                </p>
              </div>
            )}

            <div data-testid="invite-accept-btn" style={{ marginTop: 24 }}>
              <AcceptButton slug={slug} alreadyAccepted={invitation.status === 'accepted'} />
            </div>

            {invitation.status === 'accepted' && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Link href={`/invite/${slug}/preferences`} data-testid="invite-update-prefs-link" style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', textDecoration: 'none' }}>
                  Update preferences
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

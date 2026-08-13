import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getInvitationBySlug, getInvitationByToken, getPreferencesByInvitation, getEventById } from '@/lib/db';
import PreferenceForm from '@/components/forms/PreferenceForm';

export const metadata: Metadata = { title: 'Your preferences' };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PreferencesPage({ params }: Props) {
  const { slug } = await params;

  const { data: invitation } = slug.length === 64
    ? getInvitationByToken(slug)
    : getInvitationBySlug(slug);
  if (!invitation) notFound();

  const inv = invitation as Record<string, unknown>;

  if (inv.status !== 'accepted') {
    redirect(`/invite/${slug}/rsvp`);
  }

  const { data: existing } = getPreferencesByInvitation(inv.id as string);
  const { data: event } = getEventById(inv.event_id as string);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px 60px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        <div style={{ marginBottom: 28, animation: 'fu .35s var(--sp) both' }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6, fontFamily: 'var(--fb)' }}>
            Step 2 of 2 · {(event as Record<string, unknown> | null)?.title as string ?? 'Your event'}
          </div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 30, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.1 }}>
            Tell us your taste
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0, lineHeight: 1.55 }}>
            Whatever you check helps Claude blend everyone&apos;s input into restaurant picks the whole group will actually agree on.
          </p>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', boxShadow: 'var(--sh)', padding: '28px', animation: 'fu .4s var(--sp) .05s both' }}>
          <PreferenceForm token={slug} existing={existing} category={event?.category ?? 'dinner'} />
        </div>
      </div>
    </main>
  );
}

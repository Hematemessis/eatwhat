import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getInvitationBySlug, getInvitationByToken, getProposalsByEvent, getVotesByInvitation, getEventById } from '@/lib/db';
import VotingInterface from '@/components/voting/VotingInterface';

export const metadata: Metadata = { title: 'Vote' };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function VotePage({ params }: Props) {
  const { slug } = await params;

  const { data: invitation } = slug.length === 64
    ? getInvitationByToken(slug)
    : getInvitationBySlug(slug);
  if (!invitation) notFound();

  const inv = invitation as Record<string, unknown>;

  const { data: event } = getEventById(inv.event_id as string);
  if (!event || (event as Record<string, unknown>).status !== 'deciding') notFound();

  const evt = event as Record<string, unknown>;

  const { data: proposals } = getProposalsByEvent(inv.event_id as string);
  if (!(proposals as unknown[])?.length) notFound();

  const { data: priorVotes } = getVotesByInvitation(inv.id as string);
  const initialRankings: Record<string, number> = {};
  for (const v of (priorVotes ?? []) as Array<{ proposal_id: string; rank: number }>) initialRankings[v.proposal_id] = v.rank;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 64 }}>

      {/* Sticky header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border2)', padding: '18px 24px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3, fontFamily: 'var(--fb)' }}>Voting open</div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: 20, letterSpacing: '-.03em', color: 'var(--text)', margin: 0 }}>{evt.title as string}</h1>
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 7, padding: '4px 10px', fontFamily: 'var(--fb)', flexShrink: 0 }}>
            {inv.name as string}
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 24px 0' }}>

        {/* Intro */}
        <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--fb)', lineHeight: 1.6, margin: '0 0 20px', animation: 'fu .35s var(--sp) both' }}>
          Rank all <strong style={{ color: 'var(--text)' }}>{(proposals as unknown[]).length}</strong> picks from your top choice to your last. Higher ranks weight more in the final tally.
        </p>

        <VotingInterface
          proposals={proposals}
          token={slug}
          initialRankings={initialRankings}
        />

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link href={`/invite/${slug}`} style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', textDecoration: 'none' }}>
            Back to invite
          </Link>
        </div>
      </div>
    </main>
  );
}

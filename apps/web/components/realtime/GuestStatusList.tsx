'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Invitation } from '@groupplan/types';

const STATUS_COLOR: Record<string, string> = {
  pending:  'oklch(50% 0.15 72)',
  accepted: 'oklch(44% 0.15 148)',
  declined: 'oklch(44% 0.18 26)',
};

interface Props {
  eventId: string;
  initialInvitations: Invitation[];
}

export default function GuestStatusList({ eventId, initialInvitations }: Props) {
  const [invitations, setInvitations] = useState(initialInvitations);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`invitations:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invitations', filter: `event_id=eq.${eventId}` },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (payload.eventType === 'INSERT') {
            setInvitations((prev) => [...prev, payload.new as unknown as Invitation]);
          } else if (payload.eventType === 'UPDATE') {
            setInvitations((prev) =>
              prev.map((inv) => (inv.id === payload.new['id'] ? (payload.new as unknown as Invitation) : inv)),
            );
          } else if (payload.eventType === 'DELETE') {
            setInvitations((prev) => prev.filter((inv) => inv.id !== payload.old['id']));
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [eventId]);

  const accepted = invitations.filter((i) => i.status === 'accepted').length;
  const pending  = invitations.filter((i) => i.status === 'pending').length;
  const declined = invitations.filter((i) => i.status === 'declined').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 20 }}>
        {[
          { label: 'Going',    val: accepted, key: 'accepted' },
          { label: 'Pending',  val: pending,  key: 'pending' },
          { label: 'Declined', val: declined, key: 'declined' },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 22, fontFamily: 'var(--fd)', color: STATUS_COLOR[s.key] ?? 'var(--muted)', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Guest rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {invitations.map((inv) => (
          <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--rs)', border: '1px solid var(--border2)', background: 'var(--surface)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[inv.status] ?? 'var(--border)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--fb)', flex: 1 }}>{inv.name}</span>
            <span style={{ fontSize: 11, color: STATUS_COLOR[inv.status] ?? 'var(--muted)', fontFamily: 'var(--fb)', textTransform: 'capitalize' }}>{inv.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

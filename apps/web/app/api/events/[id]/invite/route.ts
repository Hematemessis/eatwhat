import { NextResponse } from 'next/server';
import { InviteGuestsSchema } from '@groupplan/types';
import { getEventById, createInvitations } from '@/lib/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const hostId = 'demo-host'; // Supabase auth removed

  const { data: event } = getEventById(id);
  if (!event || (event as Record<string, unknown>).host_id !== hostId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if ((event as Record<string, unknown>).status !== 'open' && (event as Record<string, unknown>).status !== 'collecting') {
    return NextResponse.json(
      { error: 'Invitations can only be sent while the event is open or collecting' },
      { status: 422 },
    );
  }

  const body = await request.json();
  const parsed = InviteGuestsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rows = parsed.data.guests.map((g: { name: string; email: string }) => ({
    event_id: id,
    event_slug: (event as Record<string, unknown>).slug as string,
    name: g.name,
    email: g.email,
  }));
  const { data: invitations, error } = createInvitations(rows);
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

  // Advance the event into 'collecting' on first invite
  if ((event as Record<string, unknown>).status === 'open') {
    const { updateEvent } = await import('@/lib/db');
    updateEvent(id, { status: 'collecting' });
  }

  // Host name stub — no Supabase users table
  const hostName = 'Host';

  // Email notifications disabled (no Supabase/SendGrid)
  return NextResponse.json({
    invitations,
    emails: null,
    email_disabled: true,
  }, { status: 201 });
}

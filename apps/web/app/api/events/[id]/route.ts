import { NextResponse } from 'next/server';
import { UpdateEventSchema, EVENT_STATUS_TRANSITIONS, type EventStatus } from '@groupplan/types';
import { getEventById, updateEvent, updateEventStatus, deleteEvent } from '@/lib/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  const { data: event, error } = getEventById(id);

  if (error || !event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ event });
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const hostId = 'demo-host'; // Supabase auth removed

  const body = await request.json();

  if ('status' in body) {
    const { data: event } = getEventById(id);
    if (!event || (event as Record<string, unknown>).host_id !== hostId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const allowed = EVENT_STATUS_TRANSITIONS[(event as Record<string, unknown>).status as EventStatus];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${(event as Record<string, unknown>).status} to ${body.status}` },
        { status: 422 },
      );
    }

    const { data: updated, error } = updateEventStatus(id, body.status);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: updated });
  }

  const parsed = UpdateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing } = getEventById(id);
  if (!existing || (existing as Record<string, unknown>).host_id !== hostId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: updated, error } = updateEvent(id, parsed.data as Record<string, unknown>);
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

  return NextResponse.json({ event: updated });
}

export async function DELETE(_req: Request, { params }: Context) {
  const { id } = await params;
  const hostId = 'demo-host'; // Supabase auth removed

  const { data: event } = getEventById(id);
  if (!event || (event as Record<string, unknown>).host_id !== hostId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { error } = deleteEvent(id);
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}

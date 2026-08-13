import { NextResponse } from 'next/server';
import { CreateEventSchema } from '@groupplan/types';
import { createEvent, getEventsByHost } from '@/lib/db';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    + '-' + Math.random().toString(36).slice(2, 7);
}

export async function GET() {
  // Hardcoded demo host — Supabase auth removed
  const hostId = 'demo-host';
  const { data: events, error } = getEventsByHost(hostId);
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  // Hardcoded demo host — Supabase auth removed
  const hostId = 'demo-host';

  const body = await request.json();
  const parsed = CreateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const slug = slugify(parsed.data.title);
  const { data: event, error } = createEvent(hostId, parsed.data as Record<string, unknown>, slug);

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

  return NextResponse.json({ event }, { status: 201 });
}

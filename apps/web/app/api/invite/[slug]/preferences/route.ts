import { NextResponse } from 'next/server';
import { getPreferencesSchema } from '@groupplan/types';
import { getInvitationBySlug, getInvitationByToken, upsertPreferences, getEventById } from '@/lib/db';

interface Context {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { slug } = await params;

  const { data: invitation } = slug.length === 64
    ? getInvitationByToken(slug)
    : getInvitationBySlug(slug);
  if (!invitation) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 });

  const inv = invitation as Record<string, unknown>;

  if (inv.status !== 'accepted') {
    return NextResponse.json(
      { error: 'Only accepted guests can submit preferences' },
      { status: 403 },
    );
  }

  const { data: event } = getEventById(inv.event_id as string);
  const schema = getPreferencesSchema(((event as Record<string, unknown> | null)?.category as string) ?? 'dinner');

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: preferences, error } = upsertPreferences(
    inv.id as string,
    inv.event_id as string,
    parsed.data as Record<string, unknown>,
  );

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

  return NextResponse.json({ preferences });
}

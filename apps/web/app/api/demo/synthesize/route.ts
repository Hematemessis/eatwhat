import { NextRequest, NextResponse } from 'next/server';
import { synthesizePlanWithDebug } from '@/lib/ai';
import type { SynthesizeInput, SynthesizeDebug, VenueRecord } from '@/lib/ai';
import { loadVenues, toVenueRecord } from '@/lib/venues';

// ---------------------------------------------------------------------------
// POST /api/demo/synthesize
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      location?: string;
      preferences?: SynthesizeInput['preferences'];
    };
    const location = body.location?.trim() || '深圳南山区';

    // Check API key availability
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: 'DeepSeek API key 未配置' },
        { status: 503 },
      );
    }

    // Build preferences from request body
    const preferences: SynthesizeInput['preferences'] =
      body.preferences && body.preferences.length > 0
        ? body.preferences
        : [];

    // Load all venues from seed JSON, filter by location
    const allVenues = loadVenues();
    const venueRecords: VenueRecord[] = allVenues
      .filter((v) =>
        v.address.includes(location.includes('南山') ? '南山' : location),
      )
      .map(toVenueRecord);

    // Limit venues to avoid overwhelming the prompt (top 20 by rating)
    const venues =
      (venueRecords.length > 0 ? venueRecords : allVenues.map(toVenueRecord))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 20);

    const input: SynthesizeInput = {
      preferences,
      location,
      venues,
      hostNotes:
        '所有7个人都要能容纳的店，周五晚上聚餐派队，预算总体控制在中档',
    };

    const result = await synthesizePlanWithDebug(input);

    return NextResponse.json({ proposals: result.proposals, debug: result.debug });
  } catch (err) {
    console.error('[synthesize] AI call failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Synthesis failed' },
      { status: 500 },
    );
  }
}

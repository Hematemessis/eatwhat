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

    const normalizedLocation = location.replace(/\s+/g, '');
    const isGenericShenzhen = /^深圳市?$/.test(normalizedLocation);
    const isCoveredDistrict = /南山|福田|后海|蛇口|科技园|车公庙|西丽/.test(normalizedLocation);
    const supportedLocation = isGenericShenzhen || isCoveredDistrict;
    if (!supportedLocation) {
      return NextResponse.json(
        { error: '当前演示候选库仅覆盖深圳南山和福田；接入实时地图 POI 后才能搜索其他城市。' },
        { status: 422 },
      );
    }

    // Load the demo venue pool and narrow it to the requested Shenzhen area.
    const allVenues = loadVenues();
    const area = /福田|车公庙/.test(location)
      ? '福田'
      : /南山|后海|蛇口|科技园|西丽/.test(location)
        ? '南山'
        : '';
    const venueRecords: VenueRecord[] = allVenues
      .filter((v) => !area || v.district.includes(area))
      .map(toVenueRecord);

    // Limit venues to avoid overwhelming the prompt (top 20 by rating)
    const venues =
      venueRecords
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 20);

    const input: SynthesizeInput = {
      preferences,
      location,
      venues,
      hostNotes: `已收集 ${preferences.length} 位成员偏好；优先满足硬性忌口，并解释必要的群体妥协。`,
    };

    const result = await synthesizePlanWithDebug(input);

    return NextResponse.json({
      proposals: result.proposals,
      debug: result.debug,
      venueSource: {
        type: 'demo_seed',
        coverage: ['深圳南山区', '深圳福田区'],
        candidateCount: venues.length,
      },
    });
  } catch (err) {
    console.error('[synthesize] AI call failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Synthesis failed' },
      { status: 500 },
    );
  }
}

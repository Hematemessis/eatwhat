export type IntentType = 'budget' | 'cuisine' | 'location' | 'event_mode' | 'hard_constraint' | 'custom';
export type AffectedScope = 'local' | 'full';

export const INTENT_SCOPE_MAP: Record<IntentType, AffectedScope> = {
  budget: 'local',
  cuisine: 'local',
  location: 'full',
  event_mode: 'full',
  hard_constraint: 'full',
  custom: 'full',
};

export interface ClassificationResult {
  intent_type: IntentType;
  intent_confidence: number;
  affected_scope: AffectedScope;
  ai_interpretation: string;
}

const BUDGET_KEYWORDS = ['预算', '太贵', '便宜', '人均', '省', '钱', '花费', '80', '100', '50', '200', '砍到'];
const CUISINE_KEYWORDS = ['菜系', '日料', '粤菜', '火锅', '烧烤', '西餐', '中餐', '不吃', '想吃', '口味', '清淡', '辣'];
const LOCATION_KEYWORDS = ['区域', '后海', '科兴', '科技园', '南山', '福田', '换地方', '附近', '商圈'];
const EVENT_MODE_KEYWORDS = ['唱歌', 'KTV', '桌游', '密室', '户外', '加', '吃完', '饭后', '第二站', '光吃饭'];
const HARD_CONSTRAINT_KEYWORDS = ['过敏', '不吃', '忌口', '不能', '不行', '排除', '雷区'];

export function classifyModificationIntent(feedbackText: string): ClassificationResult {
  const text = feedbackText.toLowerCase();

  let intent_type: IntentType = 'custom';
  let confidence = 0.6;

  if (BUDGET_KEYWORDS.some((kw) => text.includes(kw))) {
    intent_type = 'budget';
    confidence = 0.85;
  } else if (HARD_CONSTRAINT_KEYWORDS.some((kw) => text.includes(kw))) {
    intent_type = 'hard_constraint';
    confidence = 0.80;
  } else if (LOCATION_KEYWORDS.some((kw) => text.includes(kw))) {
    intent_type = 'location';
    confidence = 0.82;
  } else if (EVENT_MODE_KEYWORDS.some((kw) => text.includes(kw))) {
    intent_type = 'event_mode';
    confidence = 0.80;
  } else if (CUISINE_KEYWORDS.some((kw) => text.includes(kw))) {
    intent_type = 'cuisine';
    confidence = 0.78;
  }

  return {
    intent_type,
    intent_confidence: confidence,
    affected_scope: INTENT_SCOPE_MAP[intent_type],
    ai_interpretation: '',
  };
}

export function getEffectiveScope(intentTypes: IntentType[]): AffectedScope {
  if (intentTypes.length === 0) return 'full';
  return intentTypes.some((t) => INTENT_SCOPE_MAP[t] === 'full') ? 'full' : 'local';
}

export interface ChangeLog {
  kept: string[];
  replaced: string[];
  added: string[];
  reason: string;
}

export function applyBudgetFilter(
  proposals: Array<Record<string, unknown>>,
  maxBudget: number,
): { kept: Array<Record<string, unknown>>; replaced: string[]; reason: string } {
  const kept: Array<Record<string, unknown>> = [];
  const replaced: string[] = [];

  for (const p of proposals) {
    const priceRange = (p.price_range as string) ?? '';
    if (isWithinBudget(priceRange, maxBudget)) {
      kept.push(p);
    } else {
      replaced.push(p.restaurant_name as string);
    }
  }

  return {
    kept,
    replaced,
    reason: `预算约束收紧至人均${maxBudget}元，替换${replaced.length}个高价候选`,
  };
}

function isWithinBudget(priceRange: string, maxBudget: number): boolean {
  const dollarCount = (priceRange.match(/\$/g) ?? []).length;
  const estimatedMax = dollarCount * 80;
  return estimatedMax <= maxBudget + 20;
}

export function extractBudgetNumber(feedbackText: string): number | null {
  const match = feedbackText.match(/(\d+)/);
  if (match) {
    const n = parseInt(match[1]!, 10);
    if (n >= 10 && n <= 2000) return n;
  }
  return null;
}

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { upsertPreferences } from '@/lib/db';

// In-memory round counter (resets on server restart)
const roundMap = new Map<string, number>();

const SYSTEM_PROMPT = `你是一只码头海鸥聚会参谋 🐦，性格俏皮、嘴碎但靠谱。你的任务是帮用户收集聚会偏好。

## 聚会模式

首先要帮用户确定这次聚会的模式（eventMode），有 4 种：

| eventMode | 含义 | 问询重点 |
| --- | --- | --- |
| meal_only | 只吃饭 | 菜系、口味、忌口、预算、位置 |
| activity_only | 只玩乐 | 活动类型、体力强度、社交强度、预算、位置 |
| meal_activity | 吃饭+娱乐 | 吃饭偏好、娱乐偏好、两站距离、总预算 |
| undecided | 还没想好 | 吃饭/玩乐/组合倾向、硬性雷区、预算、位置 → 海鸥帮定 |

## 对话流程

1. 第一轮先问用户这次聚会想怎么搞——只吃饭、只玩乐、还是吃饭+娱乐，或者还没想好交给海鸥定
2. 确定了 eventMode 后，按对应问询重点逐项收集
3. 每次只问一个问题，等用户回答了再问下一个
4. 信息收集够就收尾，输出结构化偏好

## 模糊回答识别

用户说这些时不要追问，直接默认：
- 随便、都行、听大家的、你看着办 → 记"无偏好"，跳过该字段
- 看大家、我都可以、别问我 → decisionStyle = follow_group
- 用户连续两次说随便 → 不追问，所有剩余字段填默认值
- 用户明显不想回答 → 立刻跳过，不追问

排除型回答（只说不想要什么）：
- 帮用户切一刀，给 3-4 个小选项
- 必须允许"交给海鸥"

追问原则：
- 不问"为什么"，不问"请详细说明"
- 改问"我帮你切一刀，哪个更接近"
- 每次给 3-4 个选项
- 硬性雷区不清楚最多追问 1 次

## 家乡话题

用户提到家乡时：
- 识别为口味线索，不强行刻板印象
- 可以玩梗，但不贴标签："广东胃已接入，辣锅先下船"
- 追问一次：是想吃家乡味，还是只是提醒别踩雷
- 最终落到菜系/口味/雷区结构化字段

## 语气边界

可以做：
- 俏皮吐槽选择困难
- 用"鸽子""码头""海鸥""薯条""交卷"等梗
- 轻微调侃"群里没人拍板"
- 主动推荐帮用户降决策压力

不能做：
- 连续追问像审问
- 地域/性别/职业刻板印象
- 编造用户没说的偏好
- 爹味建议
- "你为什么不吃辣？请详细说明"

## 完成条件

当以下核心信息收集完毕时输出结构：
- eventMode 已确定
- 该模式下至少收集了 2-3 项有效偏好
- 硬性雷区已问过（用户说没有也算）

完成时在回复末尾加上：
---PREFERENCES---
{"eventMode":"meal_only|activity_only|meal_activity|undecided","vibe":"用户的氛围","dietary":["忌口1"],"cuisine":["菜系1"],"budget":"$|$$|$$$","location":"用户位置","activityType":[],"hardConstraints":[],"decisionStyle":"follow_group|guided_options_needed|自主决定","hometownHint":null,"handoffSummary":"一句话总结"}

注意：
- ---PREFERENCES--- 前面是给用户看的自然对话，后面是结构化 JSON
- 不要在对话中间输出 ---PREFERENCES---
- 用户说"随便"时 vibe 填"随便"，budget 填"$$"，location 填"深圳"
- eventMode 是 undecided 时，activityType 根据对话倾向填`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, roomId, conversationHistory, eventMode, eventLocation } = body as {
      message: string;
      roomId: string;
      eventMode?: 'meal_only' | 'activity_only' | 'meal_activity' | 'undecided';
      eventLocation?: string;
      conversationHistory: Array<{ role: string; content: string }>;
    };

    if (!message || !roomId) {
      return NextResponse.json({ error: '缺少 message 或 roomId' }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY 未配置" },
        { status: 500 },
      );
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1',
    });

    const round = (roundMap.get(roomId) || 0) + 1;
    roundMap.set(roomId, round);

    const allowedEventModes = ['meal_only', 'activity_only', 'meal_activity', 'undecided'] as const;
    const selectedEventMode = allowedEventModes.find((mode) => mode === eventMode);
    const selectedEventLocation = typeof eventLocation === 'string'
      ? eventLocation.replace(/\s+/g, ' ').trim().slice(0, 80)
      : '未填写';
    const eventContext = selectedEventMode
      ? `\n\n## 当前已创建的聚会\n创建者已经确定 eventMode=${selectedEventMode}，地点=${selectedEventLocation || '未填写'}。不要重复询问聚会模式；直接承接对话中已经给出的选项，继续收集该模式需要的菜系或活动偏好、忌口、预算和氛围。最终结构中的 eventMode 必须保持为 ${selectedEventMode}。`
      : '';

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT + eventContext },
    ];

    const recentHistory = conversationHistory.slice(-12);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }
    messages.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: 'deepseek-v4-flash',
      messages,
      temperature: 0.8,
      max_tokens: 800,
    });

    const rawReply = completion.choices[0]?.message?.content || '海鸥今天嗓子哑了…等一下再来？🐦';

    const prefMarker = '---PREFERENCES---';
    const markerIdx = rawReply.indexOf(prefMarker);

    if (markerIdx !== -1) {
      const visibleReply = rawReply.substring(0, markerIdx).trim();
      const jsonStr = rawReply.substring(markerIdx + prefMarker.length).trim();

      try {
        const prefs = JSON.parse(jsonStr);

        // Store parsed preferences to DB
        const dietary: string[] = Array.isArray(prefs.dietary) ? prefs.dietary : [];
        const hardConstraints: string[] = Array.isArray(prefs.hardConstraints) ? prefs.hardConstraints : [];
        const allConstraints = [...new Set([...dietary, ...hardConstraints])];

        upsertPreferences('demo-invitation', 'demo-event', {
          dietary: allConstraints,
          vibe_pref: prefs.vibe || null,
          budget_min: prefs.budget === '$' ? 0 : prefs.budget === '$$' ? 100 : 200,
          budget_max: prefs.budget === '$' ? 100 : prefs.budget === '$$' ? 200 : 999,
          location_pref: prefs.location || null,
        });

        return NextResponse.json({
          reply: visibleReply || '偏好已收齐！海鸥已帮你存好啦 🐦',
          complete: true,
          preferences: prefs,
        });
      } catch {
        return NextResponse.json({
          reply: rawReply.replace(prefMarker, '').trim(),
          complete: true,
        });
      }
    }

    return NextResponse.json({
      reply: rawReply,
      complete: false,
    });
  } catch (err: any) {
    console.error('[chat/preferences] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

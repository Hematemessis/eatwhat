# 今天整点啥 (EatWhat)

AI 驱动的聚餐规划工具。发起人创建可分享的邀请链接，参与者提交口味偏好，12 阶段多模型 AI 流水线推荐真实附近餐厅并按群体匹配度排序。参与者通过 Borda 计分投票，发起人一键定案，所有人收到日历邀请。

![今天整点啥 截图](assets/image.jpg)

## 在线体验

**访问地址：** [https://eatwhat-web.vercel.app](https://eatwhat-web.vercel.app)

### 使用方法

1. 打开网页后输入昵称，进入聚会计划页面。
2. 在「AI 对话」中选择只吃饭、只玩乐、吃饭加娱乐，或者让海鸥帮你决定。
3. 按照提示逐步填写口味、忌口、预算、地点和活动偏好；每轮只需要回答一个问题。
4. 信息收集完成后，可在「偏好」中查看整理结果，并前往「AI 推荐」生成聚会方案。
5. 需要其他人一起参与时，点击「邀请好友」复制并分享网页链接。

### 在线演示说明

- 在线版部署在 Vercel，AI 对话使用 DeepSeek API。
- 昵称和对话记录会保存在当前浏览器中；服务端演示数据使用临时存储，重新部署或实例重启后可能被清空。
- 请勿在演示站中填写密码、身份证号等敏感个人信息。

## How it works

1. Host creates an event with a location hint and RSVP deadline, then sends personalized invitation links
2. Guests RSVP and submit dietary restrictions, cuisine preferences, budget range, and a free-text vibe
3. Host triggers AI synthesis — the V2 pipeline runs across Anthropic, Gemini, and Voyage AI to extract constraints, discover real nearby venues, embed vibe preferences, score and rerank candidates, verify proposals against hard constraints, and generate personalized reasoning for each guest
4. Guests rank proposals; Borda count tallies votes in real time
5. Host picks the winner (or sets a vote deadline for auto-finalize), confirms the time, and EatWhat sends a winner email with a `.ics` calendar attachment to every accepted guest

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Database / Auth | Supabase (PostgreSQL + RLS + Realtime) |
| AI — reasoning | Claude Haiku + Sonnet (Anthropic) |
| AI — venue discovery | Gemini Flash (Google) |
| AI — vibe embeddings | Voyage AI (`voyage-3`) |
| Venue search | Google Places API v1 (Yelp Fusion as fallback) |
| Email | SendGrid |
| Hosting | Vercel |

## Project structure

```
eatwhat/
├── apps/
│   └── web/                    # Next.js 14 app
│       ├── app/
│       │   ├── (auth)/         # Login + magic-link verify pages
│       │   ├── (host)/         # Dashboard, event management, results
│       │   │   └── dev/        # Internal tools: log viewer, cost dashboard, pipeline inspector
│       │   ├── api/            # Route handlers (events, invites, votes, calendar…)
│       │   ├── e/[slug]/       # Public event status page (shareable group chat link)
│       │   └── invite/[slug]/  # Guest RSVP, preferences, vote, and confirmed pages
│       ├── components/
│       │   ├── forms/          # EventCreateForm, PreferenceForm, RSVPForm, FinalizeFlow
│       │   ├── demo/           # Demo UI, tab components, modals
│       │   ├── invite-templates/ # InviteView template system
│       │   ├── realtime/       # GuestStatusList (Supabase realtime)
│       │   └── ui/             # PreviewBanner, shared primitives
│       └── lib/
│           ├── auto-finalize.ts   # Check-on-read auto-finalize logic
│           ├── calendar.ts        # ICS calendar export
│           ├── email.ts           # SendGrid email rendering + sending
│           ├── scoring.ts         # bordaScore(), computeBorda()
│           └── event-status.ts    # STATUS_COLORS and STATUS_LABELS constants
├── packages/
│   ├── types/        # Shared TypeScript types + Zod schemas
│   ├── db/           # Supabase client + typed query helpers
│   ├── ai/           # 12-stage V2 pipeline + legacy Claude adapter
│   └── venues/       # Venue provider interface + Google Places / Yelp adapters
└── supabase/
    ├── migrations/   # PostgreSQL schema migrations (run in order, 001–015)
    └── setup.sql     # Full schema for fresh installs
```

## Getting started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/Hematemessis/eatwhat.git
cd eatwhat
pnpm install
```

### 2. Configure environment

```bash
cp .env.example apps/web/.env.local
```

Fill in all values in `apps/web/.env.local`. Required keys are listed below.

### 3. Set up the database

In the Supabase dashboard **SQL editor**, paste and run `supabase/setup.sql` for a fresh install.

If migrating an existing schema, run each file in `supabase/migrations/` in numerical order:

```
001_enums.sql
002_tables.sql
003_rls.sql
004_indexes.sql
005_relax_rank_checks.sql
006_usage_log.sql
007_vote_deadline.sql
008_replace_proposals_rpc.sql
009_ai_pipeline.sql
010_add_structured_constraint_columns.sql
011_v2_hardening.sql
012_event_categories.sql
013_ai_logs_month_index.sql
014_invitation_slugs.sql
015_funnel_and_flags.sql
```

### 4. Run the dev server

```bash
pnpm dev
```

App runs at [http://localhost:3000](http://localhost:3000). The host dashboard is at `/dashboard`.

## Environment variables

### Core (required)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — server-only, never expose to client |
| `ANTHROPIC_API_KEY` | Anthropic API key (Haiku + Sonnet) |
| `ANTHROPIC_MODEL_FAST` | Haiku model ID, e.g. `claude-haiku-4-5-20251001` |
| `ANTHROPIC_MODEL_REASONING` | Sonnet model ID, e.g. `claude-sonnet-4-6` |
| `GOOGLE_PLACES_API_KEY` | Google Places API v1 key |
| `PHOTO_PROXY_SECRET` | HMAC secret for photo proxy tokens |

### Pipeline V2 (required when `PIPELINE_V2=true`)

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Gemini model ID, e.g. `gemini-2.5-flash` |
| `VOYAGE_API_KEY` | Voyage AI API key |
| `VOYAGE_MODEL` | Voyage model ID, e.g. `voyage-3` |
| `PIPELINE_V2` | Feature flag — `false` by default, set `true` to enable |
| `PIPELINE_COST_CAP_MICROS` | Monthly spend cap per event in micros (default: 5000000 = $5.00) |
| `PIPELINE_LOG_LEVEL` | `info` for production; `debug` logs raw AI payloads — never use in prod |
| `ANTHROPIC_EXTENDED_THINKING` | `false` by default — only enable after verifying beta on your Anthropic account |

### Optional

| Variable | Description |
|---|---|
| `YELP_API_KEY` | Yelp Fusion fallback if Google Places is unavailable |
| `SENDGRID_API_KEY` | Email notifications (skipped gracefully if absent) |
| `SENDGRID_FROM_EMAIL` | Sender address (required if SendGrid key set) |
| `SENDGRID_FROM_NAME` | Sender display name (defaults to `EatWhat`) |
| `NEXT_PUBLIC_APP_URL` | Full origin for email links (defaults to `http://localhost:3000`) |

## Key features

### AI Pipeline V2

A 12-stage multi-provider pipeline, feature-flagged behind `PIPELINE_V2`. Each stage is independently logged to `ai_logs` for cost tracking and debugging.

| Stage | Provider | Purpose |
|---|---|---|
| Dealbreaker detector | Anthropic Haiku | Identifies hard dietary/preference blocks |
| Constraint extractor | Anthropic Haiku | Parses structured constraints from free-text preferences |
| Implicit inference | Anthropic Haiku | Surfaces unstated preferences from vibe text |
| Gemini discovery | Gemini Flash | Discovers real nearby venues via function calling |
| Menu Phantom (Tier 1) | — | Infers dietary compatibility from venue signals |
| Restaurant cache | Supabase | Deduplicates venue lookups across pipeline runs |
| Deterministic scorer | — | TOPSIS scoring: dietary 30%, budget 25%, cuisine 20%, location 15%, review 10% |
| Vibe embedder | Voyage AI | Embeds free-text vibe signals for semantic matching |
| Deterministic reranker | — | Reranks candidates combining score + vibe similarity |
| Fairness checker | — | Flags proposals that leave any guest without viable options |
| Reasoning engine | Anthropic Sonnet | Generates group narrative and per-guest personalized reasoning |
| Critic verifier | Anthropic Haiku | Removes any proposal that violates hard constraints |

Guest references in all AI prompts are anonymized (`guest_0`, `guest_1`, etc.) — invitation UUIDs never enter a model context.

**Cost circuit breaker:** triggers return HTTP 402 when monthly spend for an event reaches `PIPELINE_COST_CAP_MICROS`. Spend is tracked in `ai_logs` and visible in the host's usage badge and `/dev/costs`.

### Voting

- Guests rank proposals using a numbered rank selector
- Borda count: with N proposals, rank-1 = N pts, rank-N = 1 pt
- Live tally polled every 4s; paused during in-flight submissions to prevent race conditions
- Host can re-run AI synthesis from `deciding` state (two-click confirm wipes existing votes)

### Vote deadline & auto-finalize

- Optional `vote_deadline` on events; left null for manual control
- `maybeAutoFinalize()` runs on any read of the results, tally, or event page — idempotently locks in the Borda winner, inserts a `finalized_plans` row, and sends winner emails

### Email notifications

- All send sites use `sendBatch()` for consistent error logging
- API responses include `{ emails: { sent, failed } }` so the host can see bounce counts

### Dark mode

- Toggled via the sun/moon button in the host header
- State persisted to `localStorage.gp_tweaks.darkMode`
- Synchronous `<script>` in `<head>` applies `html[data-theme="dark"]` before first paint to prevent flash

### Public status page (`/e/[slug]`)

- Shareable link for the group chat — shows live RSVP status via Supabase realtime
- After finalization: venue card with name, cuisine, address, confirmed time, and "Open in Maps" button

### Calendar export

- `.ics` download at `/api/events/[id]/calendar` — auth-free (guests click from email)
- Times emitted as UTC with `Z` suffix so every calendar app interprets them correctly
- Includes `PRODID`, `STATUS:CONFIRMED`, and all accepted guests as attendees

### Developer tools (`/dev/*`)

Internal tooling for debugging and monitoring (host-auth gated):

- `/dev/logs` — per-stage `ai_logs` viewer with cost and latency
- `/dev/costs` — monthly spend by event with circuit breaker status
- `/dev/pipeline/[id]` — full pipeline run inspector for a specific event

## Security notes

- All host-scoped API routes verify `event.host_id === user.id` (defense-in-depth on top of RLS)
- Vote endpoint verifies the invite token belongs to the correct event and that the event is in `deciding` state
- Service client is only used in server-only paths that require bypassing RLS (auto-finalize, calendar, tally)
- Google Places photo URLs contain the API key — served through an HMAC-SHA256 signed proxy with a 24-hour TTL; expired or tampered tokens return 403
- `PIPELINE_LOG_LEVEL=debug` must never be used in production — it persists raw AI payloads to `ai_logs`

## Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Each PR should be focused and include a clear description of the change and why it was made.

## License

MIT

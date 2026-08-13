# 今天整点啥（EatWhat）

> 面向多人聚会决策的 AI 产品原型：收集成员偏好，识别冲突，并生成兼顾群体需求的聚餐/活动方案。

[![CI](https://github.com/Hematemessis/eatwhat/actions/workflows/ci.yml/badge.svg)](https://github.com/Hematemessis/eatwhat/actions/workflows/ci.yml)
[![在线体验](https://img.shields.io/badge/在线体验-eatwhat--web.vercel.app-111111)](https://eatwhat-web.vercel.app/)

**在线体验：** [https://eatwhat-web.vercel.app/](https://eatwhat-web.vercel.app/)

**项目仓库：** [https://github.com/Hematemessis/eatwhat](https://github.com/Hematemessis/eatwhat)

![今天整点啥产品截图](screenshot-cn.png)

## 这是什么

朋友聚会时，真正困难的往往不是“找一家店”，而是把每个人零散、含糊甚至互相冲突的需求整理成一个大家都能接受的方案。

EatWhat 将这个过程拆成四步：

1. 创建或加入一个聚会小组；
2. 通过 AI 对话逐步填写口味、忌口、预算、地点和活动偏好；
3. 汇总成员偏好，并让 AI 生成候选方案与推荐理由；
4. 由群主综合结果做出最终决定。

## 在线体验说明

当前 Vercel 版本是为产品路演准备的 **Demo 模式**，目标是让体验者无需注册、无需配置数据库即可走完主要体验：

- 输入昵称并创建/加入聚会；
- 在「AI 对话」中收集个人偏好；
- 在「偏好」页查看多人信息汇总；
- 在「AI 推荐」中生成候选方案和推荐理由；
- 在同一浏览器内切换成员，模拟多人协作。

Demo 数据主要保存在当前浏览器和临时服务中，可能因清除浏览器数据、重新部署或实例重启而丢失。请勿填写密码、证件号码等敏感信息。

### Demo 与完整系统的区别

仓库中还保留了邀请、RSVP、投票、日历导出、邮件通知、Supabase 数据模型和多阶段 AI Pipeline 等完整系统模块。这些模块代表产品的工程化方向，但 **并不等于全部已在当前在线 Demo 中开放**。

| 能力 | 在线 Demo | 仓库中的完整系统模块 |
|---|---:|---:|
| 昵称加入与创建聚会 | ✅ | ✅ |
| AI 对话收集偏好 | ✅ | ✅ |
| 多人偏好汇总 | ✅（浏览器内模拟） | ✅ |
| AI 候选方案与解释 | ✅ | ✅ |
| 独立分享链接与跨设备协作 | 暂未作为本轮重点 | 已有相关模块，待重新联调 |
| RSVP、投票与最终定案 | 部分演示 | 已有相关模块，待重新联调 |
| 邮件通知与 `.ics` 日历 | 未开放 | 已有相关模块，待重新联调 |

## 产品亮点

- **渐进式偏好采集**：每轮只问一个问题，降低填写负担；
- **冲突显式化**：把忌口、预算和地点等硬约束与氛围偏好分开处理；
- **群体而非单人推荐**：关注方案对所有成员的适配程度，而不是只输出“热门榜单”；
- **推荐可解释**：候选方案同时展示匹配理由和可能的妥协点；
- **面向路演的零配置体验**：打开链接即可体验，无需先部署数据库。

## 技术架构

这是一个 pnpm + Turborepo 管理的 TypeScript Monorepo。

| 层级 | 技术 |
|---|---|
| Web | Next.js 15、React 18、TypeScript |
| Demo 数据 | localStorage + SQLite 临时数据层 |
| 完整数据模型 | Supabase / PostgreSQL / RLS（保留模块） |
| AI | DeepSeek（在线 Demo）；Anthropic、Gemini、Voyage（Pipeline 模块） |
| 测试 | Vitest、Playwright |
| 工程化 | pnpm、Turborepo、GitHub Actions、Vercel |

```text
eatwhat/
├── apps/web/            # Next.js 应用与在线 Demo
│   ├── app/             # 页面与 API 路由
│   ├── components/demo/ # 路演 Demo 组件
│   └── lib/             # SQLite、推荐、通知等逻辑
├── packages/
│   ├── ai/              # AI Pipeline
│   ├── db/              # Supabase 查询模块
│   ├── types/           # 共享类型与 Zod Schema
│   └── venues/          # 场地搜索适配器
├── supabase/            # 数据库迁移与建表脚本
└── tools/qa/            # QA 与视觉测试工具
```

## 本地运行

要求：Node.js 20+、pnpm 9+。

```bash
git clone https://github.com/Hematemessis/eatwhat.git
cd eatwhat
pnpm install
pnpm dev
```

应用默认运行在 [http://localhost:3000](http://localhost:3000)。Demo 的基础页面无需 Supabase；AI 对话等服务能力需要按 `.env.example` 配置相应环境变量。

## 质量检查

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

GitHub Actions 会在推送到 `main` 或创建 Pull Request 时执行上述检查。

## Roadmap

- [ ] 重新联调独立分享链接和跨设备多人协作；
- [ ] 完成手机端关键流程适配；
- [ ] 统一 Demo 数据层与完整系统的数据模型；
- [ ] 增加稳定的路演预置数据与一键重置；
- [ ] 补充推荐质量、响应时间和完成率等产品指标。

## 协作说明

本项目由 [Hematemessis](https://github.com/Hematemessis) 与 [toRolex](https://github.com/toRolex) 协作开发。当前仓库基于 [toRolex/eatwhat](https://github.com/toRolex/eatwhat) fork，并由 Hematemessis 持续进行产品定位、在线 Demo、交互体验与工程化优化。

## License

[MIT](LICENSE)

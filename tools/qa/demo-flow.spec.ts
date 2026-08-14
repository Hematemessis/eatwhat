import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("first visit stays in onboarding instead of exposing a broken empty dashboard", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "加入聚会" })).toBeVisible();
  await expect(page.getByRole("button", { name: "关闭" })).toHaveCount(0);
  await expect(page.getByText("已收集 0/0 人偏好")).toHaveCount(0);
  await expect(page.getByTestId("demo-empty-state")).toBeAttached();
  await expect(page.getByText("先把人聚齐，")).toBeAttached();
});

test("created groups must collect at least two preferences before AI generation", async ({ page }) => {
  await page.getByPlaceholder("输入你的名字").fill("路演测试");
  await page.getByRole("button", { name: "继续 →" }).click();
  await page.getByRole("button", { name: "🎉 创建新聚会" }).click();
  await page.getByRole("button", { name: "创建聚会 →" }).click();

  await expect(page.getByTestId("decision-journey-guide")).toBeVisible();
  await expect(page.getByTestId("decision-journey-guide")).toBeInViewport();
  await expect(page.getByText("第 1 步：先让 AI 了解你")).toBeVisible();
  await expect(page.getByText("火锅 / 烧烤，热闹一点")).toBeVisible();

  await page.getByRole("button", { name: "⊞ 概览" }).click();
  await expect(page.getByText("还需要更多偏好")).toBeVisible();
  await expect(page.getByText("已收集 0/2 人偏好 · 还差 2 人")).toBeVisible();

  await page.getByRole("button", { name: /AI 推荐/ }).click();
  await expect(page.getByTestId("ai-readiness-message")).toContainText("至少需要 2 位成员");
  await expect(page.getByTestId("generate-recommendations")).toHaveCount(0);
});

test("two members can complete the full create, collect, review and recommend journey", async ({ page }) => {
  const proposals = ["路演牛肉火锅", "清爽粤菜馆", "氛围烧鸟店"].map((name, index) => ({
    rank: index + 1,
    restaurant_name: name,
    restaurant_addr: `深圳南山区测试地址 ${index + 1}`,
    cuisine_type: ["潮汕火锅", "粤菜", "日式烧鸟"][index],
    cuisine_types: [["火锅"], ["粤菜"], ["日料"]][index],
    price_range: "人均 ¥100–160",
    rating: 4.8 - index * 0.1,
    review_count: 1000 - index * 100,
    image_url: null,
    maps_url: null,
    reasoning: "测试中的稳定推荐理由，用于验证完整产品闭环。",
    constraints_met: { group_preferences: true },
    constraints_gap: {},
  }));

  await page.route("**/api/chat/preferences", async (route) => {
    const body = route.request().postDataJSON() as { userName?: string };
    const isOwner = body.userName === "小明";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: "偏好已经记录完成。",
        complete: true,
        preferences: isOwner
          ? { vibe: "热闹聚餐", dietary: ["不吃辣"], cuisine: ["火锅"], budget: "$$" }
          : { vibe: "安静聊天", dietary: ["素食"], cuisine: ["粤菜"], budget: "$" },
      }),
    });
  });
  await page.route("**/api/demo/synthesize", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ proposals }),
    });
  });

  await page.getByPlaceholder("输入你的名字").fill("小明");
  await page.getByRole("button", { name: "继续 →" }).click();
  await page.getByRole("button", { name: "🎉 创建新聚会" }).click();
  await page.getByRole("button", { name: "创建聚会 →" }).click();

  const inviteLabel = await page.getByText(/邀请码: \d{4}/).innerText();
  const inviteCode = inviteLabel.match(/\d{4}/)?.[0];
  expect(inviteCode).toBeTruthy();

  await expect(page.getByTestId("decision-journey-guide")).toBeVisible();
  await page.getByRole("button", { name: /火锅 \/ 烧烤，热闹一点/ }).click();
  await expect(page.getByText("偏好已收集完成！")).toBeVisible();
  await expect(page.getByTestId("journey-next-action")).toContainText("复制邀请码");

  await page.getByRole("button", { name: "切换 ▾" }).click();
  await page.getByRole("button", { name: "+ 新用户加入" }).click();
  await expect(page.getByTestId("load-demo-case")).toHaveCount(0);
  await page.getByPlaceholder("输入你的名字").fill("阿花");
  await page.getByRole("button", { name: "继续 →" }).click();
  await page.getByRole("button", { name: "🔗 输入邀请码加入" }).click();
  await page.getByPlaceholder("0000").fill(inviteCode!);
  await page.getByRole("button", { name: "加入聚会 →" }).click();

  await page.getByRole("button", { name: /火锅 \/ 烧烤，热闹一点/ }).click();
  await expect(page.getByText("偏好已收集完成！")).toBeVisible();

  await page.getByRole("button", { name: "切换 ▾" }).click();
  await page.getByRole("button", { name: "小明" }).click();
  await page.getByRole("button", { name: "⊞ 概览" }).click();
  await expect(page.getByText("可以生成群体方案了")).toBeVisible();

  await page.getByRole("button", { name: /偏好进度/ }).click();
  await expect(page.getByText("不吃辣").first()).toBeVisible();
  await expect(page.getByText("素食").first()).toBeVisible();

  await page.getByRole("button", { name: /AI 推荐/ }).click();
  await page.getByTestId("generate-recommendations").click();
  await expect(page.getByText("路演牛肉火锅")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("清爽粤菜馆")).toBeVisible();
});

test("preset five-person case completes overview, preferences and recommendation flow", async ({ page }) => {
  await page.getByTestId("load-demo-case").click();

  await expect(page.getByText("5/5 人 · 5 已填偏好")).toBeVisible();
  await expect(page.getByText("可以生成群体方案了")).toBeVisible();
  await expect(page.getByText("已收集 5 人偏好 — 群体决策信号已就绪")).toBeVisible();

  await page.getByRole("button", { name: /偏好进度/ }).click();
  await expect(page.getByText("素食").first()).toBeVisible();
  await expect(page.getByText("海鲜过敏").first()).toBeVisible();

  await page.getByRole("button", { name: /AI 推荐/ }).click();
  await expect(page.getByRole("heading", { name: /3 个推荐/ })).toBeVisible();
  await expect(page.getByText("八合里牛肉火锅")).toBeVisible();
  await expect(page.getByText("陶陶居·南山店")).toBeVisible();
});

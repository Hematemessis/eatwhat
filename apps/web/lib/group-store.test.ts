// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  createDemoGroup,
  createGroup,
  getRecommendationReadiness,
  loadGroup,
  updateMemberPrefs,
} from "./group-store";

describe("demo recommendation readiness", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("requires two completed member preferences", () => {
    const group = createGroup("小明", "meal_only", "深圳南山区", 5);

    expect(getRecommendationReadiness(group)).toEqual({
      completed: 0,
      required: 2,
      remaining: 2,
      ready: false,
    });

    updateMemberPrefs("小明", { cuisine: ["火锅"] });

    expect(getRecommendationReadiness(loadGroup())).toMatchObject({
      completed: 1,
      remaining: 1,
      ready: false,
    });
  });

  it("loads a five-person conflict case that is immediately ready", () => {
    const group = createDemoGroup();
    const dietaryNeeds = group.members.flatMap((member) => member.dietary);
    const budgetTiers = new Set(group.members.map((member) => member.budget));

    expect(group.members).toHaveLength(5);
    expect(group.members.every((member) => member.preferenceStatus === "done")).toBe(true);
    expect(dietaryNeeds).toContain("素食");
    expect(dietaryNeeds).toContain("海鲜过敏");
    expect(budgetTiers.size).toBeGreaterThanOrEqual(3);
    expect(getRecommendationReadiness(group)).toMatchObject({
      completed: 5,
      remaining: 0,
      ready: true,
    });
  });
});

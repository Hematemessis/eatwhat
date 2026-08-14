export interface GroupMember {
  name: string;
  ini: string;
  dietary: string[];
  cuisine: string[];
  budget: "$" | "$$" | "$$$";
  vibe: string | null;
  preferenceStatus: "joined" | "chatting" | "done";
}

export interface GroupState {
  groupId: string;
  inviteCode: string;
  ownerName: string;
  eventType: "meal_only" | "activity_only" | "meal_activity" | "undecided";
  location: string;
  maxMembers: number;
  members: GroupMember[];
  aiProposals: any[] | null;
  createdAt: number;
}

export const RECOMMENDATION_MIN_PREFERENCES = 2;

export interface RecommendationReadiness {
  completed: number;
  required: number;
  remaining: number;
  ready: boolean;
}

export function getRecommendationReadiness(
  group: Pick<GroupState, "members"> | null | undefined,
): RecommendationReadiness {
  const completed = group?.members.filter(
    (member) => member.preferenceStatus === "done",
  ).length ?? 0;
  const required = RECOMMENDATION_MIN_PREFERENCES;

  return {
    completed,
    required,
    remaining: Math.max(required - completed, 0),
    ready: completed >= required,
  };
}

const DEMO_MEMBERS: GroupMember[] = [
  {
    name: "小明",
    ini: "小明",
    dietary: ["不吃辣"],
    cuisine: ["火锅", "日料"],
    budget: "$$",
    vibe: "想热闹一点，最好能边吃边聊",
    preferenceStatus: "done",
  },
  {
    name: "阿花",
    ini: "阿花",
    dietary: ["素食"],
    cuisine: ["粤菜", "东南亚"],
    budget: "$",
    vibe: "清爽健康，人均不要太高",
    preferenceStatus: "done",
  },
  {
    name: "老张",
    ini: "老张",
    dietary: [],
    cuisine: ["烧烤", "川菜"],
    budget: "$$$",
    vibe: "这次我请客，环境和档次都要在线",
    preferenceStatus: "done",
  },
  {
    name: "小林",
    ini: "小林",
    dietary: ["海鲜过敏"],
    cuisine: ["日料", "粤菜"],
    budget: "$$",
    vibe: "希望安静一点，方便认真聊天",
    preferenceStatus: "done",
  },
  {
    name: "大刘",
    ini: "大刘",
    dietary: [],
    cuisine: ["火锅", "烧烤"],
    budget: "$$",
    vibe: "人多就要热闹，最好有聚会氛围",
    preferenceStatus: "done",
  },
];

const DEMO_PROPOSALS = [
  {
    rank: 1,
    restaurant_name: "八合里牛肉火锅",
    restaurant_addr: "深圳南山区海岸城 B1 层",
    cuisine_type: "潮汕牛肉火锅",
    cuisine_types: ["潮汕", "火锅", "清汤可选"],
    price_range: "人均 ¥120–160",
    rating: 4.8,
    review_count: 3280,
    image_url: null,
    maps_url: null,
    reasoning: "清汤锅兼顾不吃辣和海鲜过敏，肉类与素菜可以分区下锅；人均价格落在多数人的中档预算内，也保留了聚会需要的热闹氛围。",
    constraints_met: {
      non_spicy: true,
      seafood_allergy: true,
      medium_budget: true,
      lively_atmosphere: true,
    },
    constraints_gap: {
      vegetarian: "素食成员需要使用独立清汤锅，并提前确认菌菇汤底不含动物油。",
    },
  },
  {
    rank: 2,
    restaurant_name: "陶陶居·南山店",
    restaurant_addr: "深圳南山区万象天地 4 层",
    cuisine_type: "粤菜",
    cuisine_types: ["粤菜", "点心", "聚餐"],
    price_range: "人均 ¥100–150",
    rating: 4.7,
    review_count: 5120,
    image_url: null,
    maps_url: null,
    reasoning: "粤菜整体清淡，可单独安排素食和无海鲜菜品，包间适合聊天；对偏好烧烤与川菜的成员来说刺激度较低，但安全性最高。",
    constraints_met: {
      non_spicy: true,
      vegetarian: true,
      seafood_allergy: true,
      quiet_conversation: true,
    },
    constraints_gap: {
      lively_atmosphere: "环境偏稳重，热闹感不如火锅店。",
    },
  },
  {
    rank: 3,
    restaurant_name: "鸟金·炭火烧鸟",
    restaurant_addr: "深圳南山区万象天地 3 层",
    cuisine_type: "日式烧鸟",
    cuisine_types: ["日料", "烧鸟", "氛围感"],
    price_range: "人均 ¥180–240",
    rating: 4.7,
    review_count: 1860,
    image_url: null,
    maps_url: null,
    reasoning: "日料偏好与品质诉求匹配最好，也适合安静聊天；但预算较高，素食选择有限，因此作为愿意提高预算时的备选。",
    constraints_met: {
      non_spicy: true,
      premium_setting: true,
      quiet_conversation: true,
    },
    constraints_gap: {
      vegetarian: "素食主菜选择有限，需要提前沟通。",
      budget: "高于两位成员的预期预算。",
    },
  },
];

const STORAGE_KEY = "gp_group_v2";

function nameToIni(name: string): string {
  return name.slice(0, 2).toUpperCase() || "??";
}

export function loadGroup(): GroupState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GroupState;
    // Migration: backfill maxMembers for groups created before the feature
    if (!parsed.maxMembers) {
      parsed.maxMembers = parsed.members.length || 8;
      saveGroup(parsed);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveGroup(group: GroupState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(group));
}

export function clearGroup(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function createGroup(
  ownerName: string,
  eventType: GroupState["eventType"],
  location: string,
  maxMembers: number = 8
): GroupState {
  const owner: GroupMember = {
    name: ownerName,
    ini: nameToIni(ownerName),
    dietary: [],
    cuisine: [],
    budget: "$$",
    vibe: null,
    preferenceStatus: "joined",
  };

  const group: GroupState = {
    groupId: crypto.randomUUID(),
    inviteCode: String(Math.floor(1000 + Math.random() * 9000)),
    ownerName,
    eventType,
    location,
    maxMembers,
    members: [owner],
    aiProposals: null,
    createdAt: Date.now(),
  };

  saveGroup(group);
  return group;
}

export function createDemoGroup(): GroupState {
  const group: GroupState = {
    groupId: crypto.randomUUID(),
    inviteCode: String(Math.floor(1000 + Math.random() * 9000)),
    ownerName: "小明",
    eventType: "meal_only",
    location: "深圳南山区",
    maxMembers: 5,
    members: DEMO_MEMBERS.map((member) => ({
      ...member,
      dietary: [...member.dietary],
      cuisine: [...member.cuisine],
    })),
    aiProposals: DEMO_PROPOSALS,
    createdAt: Date.now(),
  };

  saveGroup(group);
  localStorage.setItem("gp_ai", "done");
  localStorage.setItem("gp_ai_proposals", JSON.stringify(DEMO_PROPOSALS));
  localStorage.removeItem("gp_ai_debug");
  return group;
}

export function joinGroup(
  name: string,
  inviteCode: string
): GroupState | "NOT_FOUND" | "WRONG_CODE" | "NAME_TAKEN" | "FULL" {
  const group = loadGroup();
  if (!group) return "NOT_FOUND";
  if (group.inviteCode !== inviteCode) return "WRONG_CODE";

  const existing = group.members.find(
    (m) => m.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return "NAME_TAKEN";

  if (group.members.length >= group.maxMembers) return "FULL";

  const member: GroupMember = {
    name,
    ini: nameToIni(name),
    dietary: [],
    cuisine: [],
    budget: "$$",
    vibe: null,
    preferenceStatus: "joined",
  };

  group.members.push(member);
  saveGroup(group);
  return group;
}

export function updateMemberPrefs(
  name: string,
  prefs: { vibe?: string; dietary?: string[]; cuisine?: string[]; budget?: "$" | "$$" | "$$$" }
): GroupState | null {
  const group = loadGroup();
  if (!group) return null;

  const member = group.members.find(
    (m) => m.name.toLowerCase() === name.toLowerCase()
  );
  if (!member) return null;

  if (prefs.vibe !== undefined) member.vibe = prefs.vibe;
  if (prefs.dietary !== undefined) member.dietary = prefs.dietary;
  if (prefs.cuisine !== undefined) member.cuisine = prefs.cuisine;
  if (prefs.budget !== undefined) member.budget = prefs.budget;
  member.preferenceStatus = "done";

  saveGroup(group);
  return group;
}

export function setMemberChatting(name: string): GroupState | null {
  const group = loadGroup();
  if (!group) return null;

  const member = group.members.find(
    (m) => m.name.toLowerCase() === name.toLowerCase()
  );
  if (!member) return null;
  if (member.preferenceStatus !== "joined") return null;

  member.preferenceStatus = "chatting";
  saveGroup(group);
  return group;
}

export function saveAiProposals(proposals: any[]): GroupState | null {
  const group = loadGroup();
  if (!group) return null;

  group.aiProposals = proposals;
  saveGroup(group);
  return group;
}

export function isOwner(name: string): boolean {
  const group = loadGroup();
  if (!group) return false;
  return group.ownerName.toLowerCase() === name.toLowerCase();
}

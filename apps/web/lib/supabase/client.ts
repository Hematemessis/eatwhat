'use client';

interface MockQueryResult {
  data: Array<Record<string, unknown>>;
  error: null;
}

interface MockChannel {
  on: (...args: unknown[]) => MockChannel;
  subscribe: () => MockChannel;
}

interface MockSelect extends PromiseLike<MockQueryResult> {
  eq: (...args: unknown[]) => MockSelect;
}

interface MockClient {
  auth: { getUser: () => Promise<{ data: { user: null }; error: null }> };
  from: (...tables: string[]) => {
    select: (...columns: string[]) => MockSelect;
  };
  channel: (name: string) => MockChannel;
  removeChannel: (channel: MockChannel) => Promise<'ok'>;
}

// Stub: Supabase client disabled in SQLite mode.
// The demo page imports this but we no longer have Supabase.
// Return a mock that doesn't crash — the demo page already has graceful fallbacks.
export function createClient(): MockClient {
  const emptyResult: MockQueryResult = { data: [], error: null };
  const client: MockClient = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from: () => ({
      select: () => {
        const query: MockSelect = {
          then: (resolve, reject) => Promise.resolve(emptyResult).then(resolve, reject),
          eq: () => query,
        };
        return query;
      },
    }),
    channel: () => {
      const channel: MockChannel = {
        on: () => channel,
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: async () => 'ok',
  };
  return client;
}

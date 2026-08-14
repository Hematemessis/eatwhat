import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from './route';

describe('POST /api/demo/synthesize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DEEPSEEK_API_KEY;
  });

  it('no API key -> 503', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/demo/synthesize', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toMatch(/DeepSeek API key/i);
  });

  it('parses location from request body', async () => {
    // Even without API key, the route handles the body
    const response = await POST(
      new NextRequest('http://localhost/api/demo/synthesize', {
        method: 'POST',
        body: JSON.stringify({ location: '福田' }),
      }),
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toMatch(/DeepSeek API key/i);
  });

  it.each(['广州市天河区', '深圳市龙岗区'])(
    'rejects %s instead of returning unrelated Shenzhen venues',
    async (location) => {
      process.env.DEEPSEEK_API_KEY = 'test-key';

      const response = await POST(
        new NextRequest('http://localhost/api/demo/synthesize', {
          method: 'POST',
          body: JSON.stringify({ location }),
        }),
      );

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error).toMatch(/仅覆盖深圳南山和福田/);
    },
  );
});

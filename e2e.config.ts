import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// 9router defaults to text/event-stream unless stream: false is explicitly set in the request JSON
const routerFetch: typeof fetch = async (url, options) => {
  if (options?.body && typeof options.body === 'string') {
    try {
      const parsed = JSON.parse(options.body);
      if (parsed.stream === undefined) {
        parsed.stream = false;
        options.body = JSON.stringify(parsed);
      }
    } catch {
      // ignore
    }
  }
  return fetch(url, options);
};

const router = createOpenAICompatible({
  name: '9router',
  baseURL: process.env.OPENAI_BASE_URL ?? process.env.ROUTER_BASE_URL ?? 'https://9router.chitraparatama.com/v1',
  apiKey: process.env.OPENAI_API_KEY ?? process.env.ROUTER_API_KEY ?? 'sk-a510b6e65efa23d4-cw4i9j-be04452e',
  fetch: routerFetch,
});

export default {
  agents: {
    default: {
      model: router(process.env.E2E_MODEL ?? process.env.OPENAI_MODEL ?? 'cx/gpt-5.6-luna'),
      system: 'You are a thorough QA agent. Verify every outcome on screen.',
    },
  },
  credentials: {
    hero: {
      username: process.env.HERO_E2E_USERNAME ?? '71261',
      password: process.env.HERO_E2E_PASSWORD ?? 'Chitra#71261',
    },
  },
  targets: [{
    engine: web(),
    app: {
      url: process.env.APP_URL ?? 'http://localhost:3000',
    },
  }],
} satisfies E2EConfig;

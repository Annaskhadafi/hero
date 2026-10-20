import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import fs from 'node:fs';

// Load local environment files if present
for (const envFile of ['.env.e2e.local', '.env.local', '.env']) {
  if (fs.existsSync(envFile)) {
    try {
      process.loadEnvFile(envFile);
    } catch {
      // ignore
    }
  }
}

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

const baseURL = process.env.e2etest_url ?? process.env.E2ETEST_URL ?? process.env.OPENAI_BASE_URL ?? process.env.ROUTER_BASE_URL ?? 'https://9router.chitraparatama.com/v1';
const apiKey = process.env.e2etest_api_key ?? process.env.E2ETEST_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.ROUTER_API_KEY ?? '';
const modelName = process.env.e2etest_model ?? process.env.E2ETEST_MODEL ?? process.env.E2E_MODEL ?? process.env.OPENAI_MODEL ?? 'cx/gpt-6-luna(low)';

const router = createOpenAICompatible({
  name: '9router',
  baseURL,
  apiKey,
  fetch: routerFetch,
  supportsStructuredOutputs: true,
});

export default {
  projectId: 'hero',
  tests: ['tests/**/*.e2e.ts'],
  output: '.e2e',
  targets: [
    {
      name: 'web',
      engine: web({
        browser: 'chromium',
      }),
      app: {
        url: process.env.E2E_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000',
      },
    },
  ],
  agents: {
    default: {
      model: router(modelName),
      system: 'You are an expert QA testing agent verifying features and bug fixes on the HERO enterprise platform.',
    },
  },
  credentials: {
    hero: {
      username: process.env.HERO_E2E_USERNAME ?? process.env.E2E_HERO_USERNAME ?? '71261',
      password: process.env.HERO_E2E_PASSWORD ?? process.env.E2E_HERO_PASSWORD ?? 'Chitra#71261',
    },
  },
} satisfies E2EConfig;

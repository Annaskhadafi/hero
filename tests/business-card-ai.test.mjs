import test from 'node:test'
import assert from 'node:assert/strict'
import { extractBusinessCardFromImage, getBusinessCardAiConfig } from '../lib/business-card-ai.ts'

const input = { fileBase64: 'Y2FyZA==', mimeType: 'image/png' }

test('uses the HERO OpenAI config as one tuple; parses printed business fields and rejects fabricated success', async (t) => {
  const prior = process.env
  process.env = { ...prior }
  t.after(() => { process.env = prior })
  Object.assign(process.env, {
    OPENAI_BASE_URL: 'https://hero-ai.example.test/v1/', OPENAI_API_KEY: 'test-shared-key', OPENAI_MODEL: 'vision-example',
    MCU_AI_URL: 'https://unused.example.test/v1', MCU_AI_API_KEY: 'test-unused', MCU_AI_MODEL: 'unused-model',
  })
  assert.deepEqual(getBusinessCardAiConfig(), {
    apiUrl: 'https://hero-ai.example.test/v1/', apiKey: 'test-shared-key', model: 'vision-example',
  })
  let mode = 'success'
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++
    assert.equal(url, 'https://hero-ai.example.test/v1/chat/completions')
    assert.equal(options.headers.Authorization, 'Bearer test-shared-key')
    const body = JSON.parse(options.body)
    assert.equal(body.stream, false)
    assert.equal(body.model, 'vision-example')
    assert.equal(body.messages[1].content[0].image_url.url, 'data:image/png;base64,Y2FyZA==')
    if (mode === 'unauthorized') return new Response('User not found', { status: 401 })
    const content = mode === 'empty' ? '{}' : JSON.stringify({ contactName: 'Rina Contoh', businessCategory: 'Logistik', productsServices: 'Angkutan kargo' })
    return Response.json({ choices: [{ message: { content } }] })
  })
  const result = await extractBusinessCardFromImage(input)
  assert.equal(result.data.contactName, 'Rina Contoh')
  assert.equal(result.data.businessCategory, 'Logistik')
  assert.equal(result.data.productsServices, 'Angkutan kargo')
  assert.equal(result.data.email, '')
  for (mode of ['empty', 'unauthorized']) {
    const failed = await extractBusinessCardFromImage(input)
    assert.equal(failed.isMockFallback, true)
    assert.equal(failed.data.contactName, '')
    assert.equal(failed.data.notes, undefined)
  }
  delete process.env.OPENAI_API_KEY
  const unconfigured = await extractBusinessCardFromImage(input)
  assert.equal(unconfigured.isMockFallback, true)
  assert.equal(unconfigured.data.contactName, '')
  assert.equal(calls, 3)
})

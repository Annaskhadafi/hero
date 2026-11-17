require('@testing-library/jest-dom')
const { TextEncoder, TextDecoder } = require('util')
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder
}

if (typeof global.Request === 'undefined') {
  global.Request = globalThis.Request || class Request {}
}
if (typeof global.Response === 'undefined') {
  global.Response = globalThis.Response || class Response {}
}
if (typeof global.Headers === 'undefined') {
  global.Headers = globalThis.Headers || class Headers {}
}
if (typeof global.FormData === 'undefined') {
  global.FormData = globalThis.FormData || class FormData {}
}
if (typeof global.fetch === 'undefined') {
  global.fetch = globalThis.fetch || (typeof fetch !== 'undefined' ? fetch : jest.fn())
}
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args)
  global.clearImmediate = (id) => clearTimeout(id)
}

jest.mock('better-auth', () => ({
  betterAuth: jest.fn(() => ({
    api: {
      getSession: jest.fn(),
    },
  })),
}))
jest.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: jest.fn(),
}))
jest.mock('better-auth/next-js', () => ({
  nextCookies: jest.fn(),
}))
jest.mock('better-auth/plugins/magic-link', () => ({
  magicLink: jest.fn(),
}))


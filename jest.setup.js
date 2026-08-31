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

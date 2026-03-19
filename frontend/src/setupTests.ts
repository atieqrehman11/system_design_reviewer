// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill for TextEncoder/TextDecoder in Node environment
import { TextEncoder, TextDecoder } from 'node:util';
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;

// Polyfill for ReadableStream in Node environment
if (typeof ReadableStream === 'undefined') {
  const { ReadableStream: PolyfillReadableStream } = require('web-streams-polyfill');
  globalThis.ReadableStream = PolyfillReadableStream;
}

// Polyfill for crypto.randomUUID in jsdom (not available in Node < 19 test env)
if (globalThis.crypto?.randomUUID === undefined) {
  const { webcrypto } = require('node:crypto');
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, writable: false });
}

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill for TextEncoder/TextDecoder in Node environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Polyfill for ReadableStream in Node environment
if (typeof ReadableStream === 'undefined') {
  const { ReadableStream: PolyfillReadableStream } = require('web-streams-polyfill');
  global.ReadableStream = PolyfillReadableStream;
}

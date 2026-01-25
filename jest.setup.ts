// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for libraries that expect Node globals
import { TextDecoder, TextEncoder } from 'util';

if (!(global as any).TextDecoder) {
	(global as any).TextDecoder = TextDecoder;
}

if (!(global as any).TextEncoder) {
	(global as any).TextEncoder = TextEncoder;
}

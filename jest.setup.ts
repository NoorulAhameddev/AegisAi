// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
// Ensure global fetch APIs exist in Node test environment
if (typeof (global as any).fetch === 'undefined') {
  try {
    // Prefer undici (bundled with Next) to avoid extra deps
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const undici = require('undici');
    (global as any).fetch = undici.fetch;
    (global as any).Headers = undici.Headers;
    (global as any).Request = undici.Request;
    (global as any).Response = undici.Response;
  } catch {
    // If undici isn't available, attempt cross-fetch
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('cross-fetch/polyfill');
    } catch (e) {
      // As a fallback, provide a minimal fetch via axios for tests
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const axios = require('axios');
      (global as any).fetch = async (url: string, options: any = {}) => {
        const method = options.method || 'GET';
        const headers = options.headers || {};
        let data = options.body;
        // If object body, stringify as JSON unless it's FormData/URLSearchParams/Buffer
        const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
        const isURLSearchParams = typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams;
        const isBuffer = typeof Buffer !== 'undefined' && Buffer.isBuffer(data);
        if (data && !isFormData && !isURLSearchParams && !isBuffer && typeof data !== 'string') {
          try { data = JSON.stringify(data); } catch {}
        }
        const resp = await axios({
          url,
          method,
          headers,
          data,
          validateStatus: () => true,
          responseType: 'text',
        });
        return {
          ok: resp.status >= 200 && resp.status < 300,
          status: resp.status,
          statusText: resp.statusText,
          headers: {
            get: (name: string) => resp.headers?.[String(name).toLowerCase()] ?? null,
          },
          text: async () => (typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data)),
          json: async () => {
            if (typeof resp.data === 'string') {
              try { return JSON.parse(resp.data); } catch { return resp.data; }
            }
            return resp.data;
          },
        };
      };
    }
  }
}

// Polyfill TextEncoder/TextDecoder for libraries that expect Node globals
import { TextDecoder, TextEncoder } from 'util';

if (!(global as any).TextDecoder) {
	(global as any).TextDecoder = TextDecoder;
}

if (!(global as any).TextEncoder) {
	(global as any).TextEncoder = TextEncoder;
}

import http from "http";
import https from "https";
import dns from "dns";
import net from "net";
import tls from "tls";
import { URL } from "url";
import axios, { AxiosResponse } from "axios";

export function normalizeIp(ip: string): string {
  const cleaned = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  // Strip IPv4-mapped IPv6 prefix ::ffff:
  if (cleaned.startsWith("::ffff:")) {
    const rawIpv4 = cleaned.substring(7);
    if (net.isIPv4(rawIpv4)) return rawIpv4;
  }
  return cleaned;
}

export function ipToBigInt(ip: string, family: 4 | 6): bigint {
  if (family === 4) {
    return ip.split(".").reduce((acc, octet) => (acc << 8n) + BigInt(octet), 0n);
  }
  // IPv6 expansion
  const parts = ip.split("::");
  const left = parts[0] ? parts[0].split(":") : [];
  const right = parts[1] ? parts[1].split(":") : [];
  const missing = 8 - (left.length + right.length);
  const full = [...left, ...Array(missing).fill("0"), ...right];
  return full.reduce((acc, hex) => (acc << 16n) + BigInt(parseInt(hex || "0", 16)), 0n);
}

export function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  const ipFamily = net.isIP(ip) as 4 | 6;
  const rangeFamily = net.isIP(range) as 4 | 6;
  if (!ipFamily || ipFamily !== rangeFamily) return false;

  const totalBits = ipFamily === 4 ? 32n : 128n;
  const mask = ((1n << BigInt(bits)) - 1n) << (totalBits - BigInt(bits));
  const ipBig = ipToBigInt(ip, ipFamily);
  const rangeBig = ipToBigInt(range, rangeFamily);

  return (ipBig & mask) === (rangeBig & mask);
}

export const BLOCKED_CIDRS = [
  // IPv4 Private, Loopback, Link-Local, Cloud Metadata
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.88.99.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
  "255.255.255.255/32",
  // IPv6
  "::/128",
  "::1/128",
  "::ffff:0:0/96",
  "64:ff9b::/96",
  "100::/64",
  "2001:2::/48",
  "2001:db8::/32",
  "2002::/16",
  "fc00::/7",
  "fe80::/10",
  "ff00::/8",
];

export function isBlockedIp(rawIp: string): boolean {
  const ip = normalizeIp(rawIp);
  for (const cidr of BLOCKED_CIDRS) {
    if (isIpInCidr(ip, cidr)) return true;
  }
  return false;
}

/**
 * Creates custom HTTP/HTTPS agent that overrides both 'lookup' and 'createConnection'
 * Prevents DNS rebinding and IP literal bypass vectors
 */
export function createSafeHttpAgent(isHttps: boolean) {
  const BaseAgent = isHttps ? https.Agent : http.Agent;

  return new (class SafeAgent extends BaseAgent {
    // 1. Override createConnection to intercept raw sockets before HTTP bytes transmit
    override createConnection(options: any, callback?: any): any {
      const host = options.host || options.hostname;

      // Direct check: If destination is an IP literal, evaluate immediately before dialing
      if (host) {
        const cleanHost = String(host).replace(/^\[|\]$/g, "");
        if (net.isIP(cleanHost)) {
          const normalized = normalizeIp(cleanHost);
          if (isBlockedIp(normalized)) {
            const err = new Error(
              `SSRF blocked: Direct socket connection to disallowed IP ${host}`,
            );
            if (callback) callback(err);
            throw err;
          }
        }
      }

      // Establish underlying socket
      const socket = isHttps
        ? tls.connect(options)
        : net.createConnection(options);

      const verifySocket = () => {
        const remoteIp = normalizeIp(socket.remoteAddress || "");
        if (remoteIp && isBlockedIp(remoteIp)) {
          const err = new Error(
            `SSRF blocked: Remote socket connected to disallowed IP ${remoteIp}`,
          );
          socket.destroy(err);
          if (callback) callback(err, socket);
        }
      };

      if (isHttps) {
        socket.once("secureConnect", verifySocket);
      } else {
        socket.once("connect", verifySocket);
      }

      if (callback) {
        socket.once(isHttps ? "secureConnect" : "connect", () =>
          callback(null, socket),
        );
        socket.once("error", (err) => callback(err));
      }

      return socket;
    }
  })({
    // 2. Override lookup hook to evaluate all resolved DNS addresses
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { all: true }, (err, addresses) => {
        if (err) return callback(err, "", 4);
        if (!addresses || addresses.length === 0) {
          return callback(
            new Error(
              `DNS resolution returned zero records for ${hostname}`,
            ),
            "",
            4,
          );
        }

        for (const addr of addresses) {
          const normalized = normalizeIp(addr.address);
          if (isBlockedIp(normalized)) {
            return callback(
              new Error(
                `SSRF blocked: Hostname ${hostname} resolves to disallowed IP ${addr.address}`,
              ),
              "",
              4,
            );
          }
        }

        // Return first verified address
        callback(null, addresses[0].address, addresses[0].family);
      });
    },
  });
}

export interface SafeFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: any;
  data: any;
  text: () => Promise<string>;
  json: () => Promise<any>;
}

/**
 * Validates target URL and executes a safe fetch with up to 3 redirect hops
 */
export async function validateAndFetchSafeUrl(
  targetUrl: string,
  maxHops: number = 3,
): Promise<SafeFetchResponse> {
  let currentUrl = targetUrl;
  let hops = 0;

  while (hops <= maxHops) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      throw new Error(`Invalid URL: ${currentUrl}`);
    }

    // Enforce protocol whitelist
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(
        `SSRF blocked: Unsupported protocol '${parsed.protocol}'`,
      );
    }

    // Pre-flight validation if hostname is an IP literal
    const cleanHost = parsed.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(cleanHost)) {
      const normalized = normalizeIp(cleanHost);
      if (isBlockedIp(normalized)) {
        throw new Error(
          `SSRF blocked: Target hostname is a disallowed IP literal ${parsed.hostname}`,
        );
      }
    } else {
      // Pre-resolve DNS to evaluate all addresses before dialing
      await new Promise<void>((resolve, reject) => {
        dns.lookup(cleanHost, { all: true }, (err, addresses) => {
          if (err) return reject(err);
          if (!addresses || addresses.length === 0) {
            return reject(
              new Error(
                `DNS resolution returned zero records for ${cleanHost}`,
              ),
            );
          }
          for (const addr of addresses) {
            const norm = normalizeIp(addr.address);
            if (isBlockedIp(norm)) {
              return reject(
                new Error(
                  `SSRF blocked: Hostname ${cleanHost} resolves to disallowed IP ${addr.address}`,
                ),
              );
            }
          }
          resolve();
        });
      });
    }

    const isHttps = parsed.protocol === "https:";
    const agent = createSafeHttpAgent(isHttps);

    const axiosRes: AxiosResponse = await axios.get(currentUrl, {
      httpAgent: isHttps ? undefined : agent,
      httpsAgent: isHttps ? agent : undefined,
      maxRedirects: 0,
      validateStatus: () => true, // Don't throw on 3xx/4xx/5xx to handle redirects manually
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AegisAI/1.0",
      },
      responseType: "text",
    });

    if ([301, 302, 303, 307, 308].includes(axiosRes.status)) {
      const location =
        axiosRes.headers["location"] || axiosRes.headers["Location"];
      if (!location) {
        throw new Error("Redirect response missing Location header");
      }
      hops++;
      if (hops > maxHops) {
        throw new Error(
          `SSRF blocked: Exceeded maximum redirect hops (${maxHops})`,
        );
      }

      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    const dataString =
      typeof axiosRes.data === "string"
        ? axiosRes.data
        : JSON.stringify(axiosRes.data);

    const headersMap = new Map<string, string>();
    for (const [k, v] of Object.entries(axiosRes.headers)) {
      if (typeof v === "string") {
        headersMap.set(k.toLowerCase(), v);
      }
    }

    const responseHeaders: any = { ...axiosRes.headers };
    responseHeaders.get = (headerName: string) =>
      headersMap.get(headerName.toLowerCase()) || null;

    return {
      ok: axiosRes.status >= 200 && axiosRes.status < 300,
      status: axiosRes.status,
      statusText: axiosRes.statusText || "",
      headers: responseHeaders,
      data: axiosRes.data,
      text: async () => dataString,
      json: async () => JSON.parse(dataString),
    };
  }

  throw new Error("Redirect loop terminated");
}

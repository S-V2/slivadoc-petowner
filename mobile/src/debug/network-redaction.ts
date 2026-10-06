import type { NetworkLogEntry, NetworkLoggerAction } from "react-native-network-inspector-devtools";
export type { NetworkLoggerAction } from "react-native-network-inspector-devtools";

const hidden = "[REDACTED]";
const bodyLimit = 48_000;
const sensitiveKey = /authorization|cookie|password|passwd|secret|token|apikey|privatekey|clientkey|signature|otp|verificationcode/i;

function isSensitive(key: string) {
  return sensitiveKey.test(key.replace(/[^a-z0-9]/gi, ""));
}

function redactText(value: string) {
  return value
    .replace(/\bBearer\s+[^\s"',;]+/gi, `Bearer ${hidden}`)
    .replace(/\beyJ[\w-]*\.[\w-]+\.[\w-]+/g, hidden)
    // Also handle a JSON body truncated by the inspector before parsing.
    .replace(/("[^"\n]*(?:authorization|cookie|password|passwd|secret|token|api[_-]?key|private[_-]?key|client[_-]?key|signature|otp|verification[_-]?code)[^"\n]*"\s*:\s*)"(?:[^"\\]|\\.)*"?/gi, `$1"${hidden}"`)
    .replace(/((?:authorization|cookie|password|passwd|secret|token|api[_-]?key|private[_-]?key|client[_-]?key|otp|signature|verification[_-]?code)[\w-]*=)[^&\s]+/gi, `$1${hidden}`);
}

function redactJSON(value: unknown, depth = 0): unknown {
  if (depth > 25) return "[Nested data omitted]";
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactJSON(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      isSensitive(key) ? hidden : redactJSON(item, depth + 1),
    ]));
  }
  return value;
}

export function redactNetworkBody(body: string | undefined) {
  if (body === undefined) return undefined;
  let result: string;
  try {
    result = JSON.stringify(redactJSON(JSON.parse(body)));
  } catch {
    result = redactText(body);
  }
  return result.length > bodyLimit ? `${result.slice(0, bodyLimit)}\n[Body truncated]` : result;
}

export function redactNetworkHeaders(headers: Record<string, string>) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [
    key,
    isSensitive(key) ? hidden : redactText(value),
  ]));
}

export function redactNetworkURL(value: string) {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    const parameters = Array.from(url.searchParams.entries());
    url.search = "";
    for (const [key, item] of parameters) {
      url.searchParams.append(key, isSensitive(key) ? hidden : redactText(item));
    }
    url.hash = "";
    return url.toString();
  } catch {
    return redactText(value);
  }
}

function redactEntry<T extends Partial<NetworkLogEntry>>(entry: T): T {
  return {
    ...entry,
    ...(entry.url !== undefined ? { url: redactNetworkURL(entry.url) } : {}),
    ...(entry.requestHeaders ? { requestHeaders: redactNetworkHeaders(entry.requestHeaders) } : {}),
    ...(entry.responseHeaders ? { responseHeaders: redactNetworkHeaders(entry.responseHeaders) } : {}),
    ...(entry.requestBody !== undefined ? { requestBody: redactNetworkBody(entry.requestBody) } : {}),
    ...(entry.responseBody !== undefined ? { responseBody: redactNetworkBody(entry.responseBody) } : {}),
  };
}

// Sanitize only the stored copy; the real request and response stay unchanged.
export function redactNetworkAction(action: NetworkLoggerAction): NetworkLoggerAction {
  if (action.type === "ADD_ENTRY") return { ...action, payload: redactEntry(action.payload) };
  if (action.type === "UPDATE_ENTRY") return {
    ...action,
    payload: { ...action.payload, patch: redactEntry(action.payload.patch) },
  };
  return action;
}

export function isNetworkLoggerEnabled(development: boolean, flag?: string) {
  return development || flag === "1" || flag === "true";
}

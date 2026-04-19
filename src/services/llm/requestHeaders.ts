import { getBrowserHeaders } from "./apiFormatUtils";

function buildBaseHeaders(
  apiKey: string,
  simulateBrowser: boolean
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...(simulateBrowser ? getBrowserHeaders() : {}),
  };
}

export function buildOpenAIStreamHeaders(
  apiKey: string,
  simulateBrowser: boolean
): Record<string, string> {
  return {
    ...buildBaseHeaders(apiKey, simulateBrowser),
    Accept: "text/event-stream",
  };
}

export function buildAnthropicStreamHeaders(
  apiKey: string,
  simulateBrowser: boolean
): Record<string, string> {
  return {
    ...buildBaseHeaders(apiKey, simulateBrowser),
    Accept: "text/event-stream",
    "anthropic-version": "2023-06-01",
  };
}

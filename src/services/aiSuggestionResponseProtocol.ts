export const AI_BODY_START_MARKER = "<<<JASBLOG_BODY_START>>>";
export const AI_BODY_END_MARKER = "<<<JASBLOG_BODY_END>>>";

export interface ExtractedSuggestionBody {
  body: string;
  started: boolean;
  completed: boolean;
}

function stripLeadingBoundaryLineBreak(text: string): string {
  if (text.startsWith("\r\n")) {
    return text.slice(2);
  }

  if (text.startsWith("\n") || text.startsWith("\r")) {
    return text.slice(1);
  }

  return text;
}

function stripTrailingBoundaryLineBreak(text: string): string {
  if (text.endsWith("\r\n")) {
    return text.slice(0, -2);
  }

  if (text.endsWith("\n") || text.endsWith("\r")) {
    return text.slice(0, -1);
  }

  return text;
}

function normalizeExtractedBody(text: string, completed: boolean): string {
  const withoutLeadingBoundaryBreak = stripLeadingBoundaryLineBreak(text);
  return completed
    ? stripTrailingBoundaryLineBreak(withoutLeadingBoundaryBreak)
    : withoutLeadingBoundaryBreak;
}

export function extractSuggestionBody(rawText: string): ExtractedSuggestionBody {
  const startIndex = rawText.indexOf(AI_BODY_START_MARKER);
  if (startIndex === -1) {
    return {
      body: "",
      started: false,
      completed: false,
    };
  }

  const bodyStart = startIndex + AI_BODY_START_MARKER.length;
  const endIndex = rawText.indexOf(AI_BODY_END_MARKER, bodyStart);
  if (endIndex === -1) {
    return {
      body: normalizeExtractedBody(rawText.slice(bodyStart), false),
      started: true,
      completed: false,
    };
  }

  return {
    body: normalizeExtractedBody(rawText.slice(bodyStart, endIndex), true),
    started: true,
    completed: true,
  };
}

export function isPreviewableSuggestionBody(
  extracted: ExtractedSuggestionBody
): boolean {
  return extracted.completed || extracted.body.trim().length > 0;
}

export function getMissingBodyProtocolMessage(): string {
  return [
    "AI 未按协议返回正文边界标记，已阻止生成 diff。",
    `请让模型只在 ${AI_BODY_START_MARKER} 与 ${AI_BODY_END_MARKER} 之间输出最终正文。`,
  ].join("\n");
}

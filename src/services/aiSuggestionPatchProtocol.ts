/**
 * Patch 协议：解析 LLM 输出的 FIND/REPLACE 对并应用到源文档。
 *
 * 格式：
 * <<<FIND>>>
 * 旧文本
 * <<<REPLACE>>>
 * 新文本
 * <<<FIND>>>
 * ...
 *
 * 全部包裹在 JASBLOG_BODY_START/END 之间。
 */

export const AI_FIND_MARKER = "<<<FIND>>>";
export const AI_REPLACE_MARKER = "<<<REPLACE>>>";

export interface PatchEntry {
  find: string;
  replace: string;
}

export interface ExtractedPatches {
  patches: PatchEntry[];
  /** 最后一个 FIND/REPLACE 对是否已完整闭合 */
  lastPairCompleted: boolean;
}

export interface ApplyPatchesResult {
  content: string;
  appliedCount: number;
  failedFinds: string[];
}

function stripBoundaryLineBreak(text: string): string {
  if (text.startsWith("\r\n")) {
    return text.slice(2);
  }
  if (text.startsWith("\n")) {
    return text.slice(1);
  }
  return text;
}

function stripTrailingBoundaryLineBreak(text: string): string {
  if (text.endsWith("\r\n")) {
    return text.slice(0, -2);
  }
  if (text.endsWith("\n")) {
    return text.slice(0, -1);
  }
  return text;
}

/**
 * 从 body 文本中提取所有 FIND/REPLACE 对。
 * body 是已经从 JASBLOG_BODY_START/END 中提取出来的内容。
 * bodyCompleted 为 true 时表示 BODY_END 已收到，最后一个 REPLACE 的内容是完整的。
 */
export function extractPatchEntries(body: string, bodyCompleted = false): ExtractedPatches {
  const patches: PatchEntry[] = [];
  let searchFrom = 0;
  let lastPairCompleted = true;

  while (searchFrom < body.length) {
    const findStart = body.indexOf(AI_FIND_MARKER, searchFrom);
    if (findStart === -1) {
      break;
    }

    const findContentStart = findStart + AI_FIND_MARKER.length;
    const replaceStart = body.indexOf(AI_REPLACE_MARKER, findContentStart);
    if (replaceStart === -1) {
      lastPairCompleted = false;
      break;
    }

    const findText = stripTrailingBoundaryLineBreak(
      stripBoundaryLineBreak(body.slice(findContentStart, replaceStart))
    );

    const replaceContentStart = replaceStart + AI_REPLACE_MARKER.length;
    const nextFindStart = body.indexOf(AI_FIND_MARKER, replaceContentStart);
    const isLastPair = nextFindStart === -1;

    if (isLastPair && !bodyCompleted) {
      lastPairCompleted = false;
      break;
    }

    const replaceEnd = isLastPair ? body.length : nextFindStart;
    const replaceText = stripTrailingBoundaryLineBreak(
      stripBoundaryLineBreak(body.slice(replaceContentStart, replaceEnd))
    );

    if (findText) {
      patches.push({ find: findText, replace: replaceText });
    }

    lastPairCompleted = nextFindStart !== -1 || replaceContentStart < body.length;
    searchFrom = replaceEnd;
  }

  return { patches, lastPairCompleted };
}

/**
 * 将 patch 列表应用到源文档。每个 FIND 在源文中查找第一处匹配并替换。
 * 按照 patch 在文档中的出现顺序从前往后应用，避免偏移量累积错误。
 */
export function applyPatches(
  sourceContent: string,
  patches: readonly PatchEntry[]
): ApplyPatchesResult {
  if (patches.length === 0) {
    return { content: sourceContent, appliedCount: 0, failedFinds: [] };
  }

  /** 先定位所有 patch 在源文中的位置，按位置排序后顺序替换 */
  const located = patches
    .map((patch) => ({
      patch,
      index: sourceContent.indexOf(patch.find),
    }))
    .filter((entry) => entry.index !== -1)
    .sort((a, b) => a.index - b.index);

  const failedFinds = patches
    .filter((patch) => sourceContent.indexOf(patch.find) === -1)
    .map((patch) => patch.find.slice(0, 60));

  let result = "";
  let cursor = 0;

  for (const { patch, index } of located) {
    result += sourceContent.slice(cursor, index);
    result += patch.replace;
    cursor = index + patch.find.length;
  }

  result += sourceContent.slice(cursor);

  return {
    content: result,
    appliedCount: located.length,
    failedFinds,
  };
}

/** body 中是否包含 FIND 标记（用于判断 LLM 是否遵循了 patch 协议） */
export function isPatchFormatBody(body: string): boolean {
  return body.includes(AI_FIND_MARKER);
}

type IssueGroup = readonly string[] | string | null | undefined;

export function combineIssueMessages(...groups: IssueGroup[]): string | undefined {
  const seen = new Set<string>();
  const messages: string[] = [];

  for (const group of groups) {
    const values = Array.isArray(group) ? group : [group];

    for (const value of values) {
      const text = value?.trim();
      if (!text || seen.has(text)) {
        continue;
      }

      seen.add(text);
      messages.push(text);
    }
  }

  return messages.length > 0 ? messages.join('\n') : undefined;
}

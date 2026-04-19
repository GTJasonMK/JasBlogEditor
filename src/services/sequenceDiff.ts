export type DiffOperationKind = "equal" | "remove" | "add";

export interface DiffOperation<T> {
  kind: DiffOperationKind;
  value: T;
}

type EqualityMatcher<T> = (left: T, right: T) => boolean;

function buildLcsTable<T>(
  previous: readonly T[],
  next: readonly T[],
  isEqual: EqualityMatcher<T>
): number[][] {
  const table = Array.from({ length: previous.length + 1 }, () =>
    Array<number>(next.length + 1).fill(0)
  );

  for (let left = previous.length - 1; left >= 0; left -= 1) {
    for (let right = next.length - 1; right >= 0; right -= 1) {
      table[left][right] = isEqual(previous[left], next[right])
        ? table[left + 1][right + 1] + 1
        : Math.max(table[left + 1][right], table[left][right + 1]);
    }
  }

  return table;
}

function collectOperations<T>(
  previous: readonly T[],
  next: readonly T[],
  table: number[][],
  isEqual: EqualityMatcher<T>
): DiffOperation<T>[] {
  const operations: DiffOperation<T>[] = [];
  let left = 0;
  let right = 0;

  while (left < previous.length && right < next.length) {
    if (isEqual(previous[left], next[right])) {
      operations.push({ kind: "equal", value: previous[left] });
      left += 1;
      right += 1;
      continue;
    }

    if (table[left + 1][right] >= table[left][right + 1]) {
      operations.push({ kind: "remove", value: previous[left] });
      left += 1;
      continue;
    }

    operations.push({ kind: "add", value: next[right] });
    right += 1;
  }

  while (left < previous.length) {
    operations.push({ kind: "remove", value: previous[left] });
    left += 1;
  }

  while (right < next.length) {
    operations.push({ kind: "add", value: next[right] });
    right += 1;
  }

  return operations;
}

export function diffSequence<T>(
  previous: readonly T[],
  next: readonly T[],
  isEqual: EqualityMatcher<T>
): DiffOperation<T>[] {
  return collectOperations(previous, next, buildLcsTable(previous, next, isEqual), isEqual);
}

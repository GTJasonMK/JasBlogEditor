import { WidgetType } from "@codemirror/view";

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}

function createDiffRow(
  rowClass: string,
  signText: string,
  contentText: string
): HTMLElement {
  const row = document.createElement("div");
  row.className = `cm-ai-diff-line ${rowClass}`;
  const sign = document.createElement("span");
  sign.className = "cm-ai-diff-line-sign";
  sign.textContent = signText;
  const content = document.createElement("span");
  content.className = "cm-ai-diff-line-content";
  content.textContent = contentText.length > 0 ? contentText : "\u00A0";
  row.append(sign, content);
  return row;
}

export class AddedTextWidget extends WidgetType {
  constructor(private readonly text: string) {
    super();
  }

  eq(other: AddedTextWidget): boolean {
    return other.text === this.text;
  }

  toDOM(): HTMLElement {
    const element = document.createElement("span");
    element.className = "cm-ai-added-inline";
    element.textContent = this.text;
    return element;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export class UnifiedDiffBlockWidget extends WidgetType {
  constructor(
    private readonly removedLines: readonly string[],
    private readonly addedLines: readonly string[]
  ) {
    super();
  }

  eq(other: UnifiedDiffBlockWidget): boolean {
    return (
      arraysEqual(this.removedLines, other.removedLines) &&
      arraysEqual(this.addedLines, other.addedLines)
    );
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-ai-diff-unified";
    this.removedLines.forEach((line) => {
      wrapper.append(createDiffRow("cm-ai-diff-line-remove", "-", line));
    });
    this.addedLines.forEach((line) => {
      wrapper.append(createDiffRow("cm-ai-diff-line-add", "+", line));
    });
    return wrapper;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export class StreamingFrontierWidget extends WidgetType {
  eq(): boolean {
    return true;
  }

  toDOM(): HTMLElement {
    const element = document.createElement("span");
    element.className = "cm-ai-streaming-frontier";
    element.setAttribute("aria-hidden", "true");
    return element;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

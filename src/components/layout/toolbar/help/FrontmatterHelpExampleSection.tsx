import { FrontmatterHelpExamplePreview } from "@/features/examplePreview/FrontmatterHelpExamplePreview";
import {
  CodeCard,
  PreviewCard,
  Section,
  SideBySideExample,
} from "./helpBlocks";
import type {
  FrontmatterHelpExample,
  FrontmatterHelpScenario,
} from "./frontmatterHelpData";

function ExampleGuidance({
  example,
}: {
  example: FrontmatterHelpExample;
}) {
  return (
    <PreviewCard title="适用场景">
      <p className="break-words text-sm leading-relaxed text-[var(--color-text)]">
        {example.suitableFor}
      </p>
    </PreviewCard>
  );
}

function ExamplePractices({
  example,
}: {
  example: FrontmatterHelpExample;
}) {
  return (
    <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
      <PreviewCard title="最常见写法">
        <ul className="break-words list-disc space-y-1 pl-5 text-sm text-[var(--color-text)]">
          {example.commonPatterns.map((pattern) => (
            <li key={pattern}>{pattern}</li>
          ))}
        </ul>
      </PreviewCard>
      <PreviewCard title="写作建议">
        <ul className="break-words list-disc space-y-1 pl-5 text-sm text-[var(--color-text)]">
          {example.writingTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </PreviewCard>
    </div>
  );
}

function ExampleScenario({
  scenario,
}: {
  scenario: FrontmatterHelpScenario;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-4">
      <h4 className="break-words text-sm font-medium text-[var(--color-text)]">
        {scenario.title}
      </h4>
      <p className="mt-1 break-words text-xs leading-relaxed text-[var(--color-text-muted)]">
        {scenario.description}
      </p>
      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
        <CodeCard title="写法示例" code={scenario.code} />
        <PreviewCard title="使用说明">
          <ul className="break-words list-disc space-y-1 pl-5 text-sm text-[var(--color-text)]">
            {scenario.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </PreviewCard>
      </div>
    </div>
  );
}

function ExampleScenarios({
  example,
}: {
  example: FrontmatterHelpExample;
}) {
  if (!example.scenarioExamples?.length) {
    return null;
  }

  return (
      <Section id="frontmatter-scenarios" title="常见场景示例">
      <div className="space-y-4">
        {example.scenarioExamples.map((scenario) => (
          <ExampleScenario key={scenario.id} scenario={scenario} />
        ))}
      </div>
    </Section>
  );
}

export function FrontmatterHelpExampleSection({
  example,
  openingExampleId,
  windowError,
  onOpenExampleWindow,
}: {
  example: FrontmatterHelpExample;
  openingExampleId: string | null;
  windowError: { exampleId: string; message: string } | null;
  onOpenExampleWindow: (exampleId: string) => Promise<void>;
}) {
  const isOpening = openingExampleId === example.id;

  return (
    <>
      <Section
        id="frontmatter-selected-example"
        title={`当前聚焦：${example.title}`}
      >
        <ExampleGuidance example={example} />
        <ExamplePractices example={example} />
        <div className="mt-4 min-w-0 flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="break-words text-sm font-medium text-[var(--color-text)]">
              原始文档 + 真实渲染
            </p>
            <p className="mt-1 break-words text-xs text-[var(--color-text-muted)]">
              内联示例用于快速浏览；需要完整对照时，可直接打开独立窗口。
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void onOpenExampleWindow(example.id)}
            disabled={isOpening}
          >
            {isOpening ? "正在打开..." : "在新窗口中查看"}
          </button>
        </div>
        {windowError?.exampleId === example.id ? (
          <p className="mt-3 break-words text-xs text-[var(--color-danger)]">
            打开独立窗口失败：{windowError.message}
          </p>
        ) : null}
      </Section>

      <ExampleScenarios example={example} />

      <SideBySideExample
        title={`${example.title} 完整示例`}
        description={example.description}
        code={example.raw}
        preview={<FrontmatterHelpExamplePreview example={example} />}
        previewTitle="渲染效果（真实预览）"
      />
    </>
  );
}

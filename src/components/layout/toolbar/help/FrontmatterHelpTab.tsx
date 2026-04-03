import { useState } from "react";
import { FrontmatterHelpExamplePreview } from "@/features/examplePreview/FrontmatterHelpExamplePreview";
import { openExamplePreviewWindow } from "@/features/examplePreview/openExamplePreviewWindow";
import {
  MarkdownPreview,
  PreviewCard,
  Section,
  SideBySideExample,
} from "./helpBlocks";
import {
  FRONTMATTER_FAQ,
  FRONTMATTER_FIELD_TABLE,
  FRONTMATTER_HELP_EXAMPLES,
  FRONTMATTER_WRITING_RULES,
  type FrontmatterHelpExample,
} from "./frontmatterHelpData";

function ExampleGuidance({
  example,
}: {
  example: FrontmatterHelpExample;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
      <PreviewCard title="最常见写法">
        <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
          {example.commonPatterns.map((pattern) => (
            <li key={pattern}>{pattern}</li>
          ))}
        </ul>
      </PreviewCard>
      <PreviewCard title="写作建议">
        <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
          {example.writingTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </PreviewCard>
    </div>
  );
}

export function FrontmatterHelpTab() {
  const [openingExampleId, setOpeningExampleId] = useState<string | null>(null);
  const [windowError, setWindowError] = useState<{
    exampleId: string;
    message: string;
  } | null>(null);

  async function handleOpenExampleWindow(exampleId: string) {
    setOpeningExampleId(exampleId);
    setWindowError(null);

    try {
      await openExamplePreviewWindow(exampleId);
    } catch (error) {
      setWindowError({
        exampleId,
        message:
          error instanceof Error ? error.message : "打开示例窗口失败",
      });
    } finally {
      setOpeningExampleId((current) =>
        current === exampleId ? null : current
      );
    }
  }

  return (
    <div>
      <Section id="frontmatter-support" title="说明">
        <p className="text-sm text-[var(--color-text)] leading-relaxed">
          支持 YAML frontmatter（文件开头的 <code className="font-mono">---</code>{" "}
          区块）。应用会先把 frontmatter 解析为元数据，再根据不同内容类型决定头部、列表卡片和特殊预览如何显示；正文部分继续按
          Markdown 渲染。
        </p>
      </Section>

      <SideBySideExample
        title="字段矩阵速查"
        id="frontmatter-fields"
        description="按内容类型汇总必填/可选字段与默认回退行为。"
        code={FRONTMATTER_FIELD_TABLE}
        preview={<MarkdownPreview content={FRONTMATTER_FIELD_TABLE} />}
        previewTitle="字段说明（表格渲染）"
      />

      <Section id="frontmatter-writing-rules" title="写作通用规则">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PreviewCard title="写作原则">
            <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
              {FRONTMATTER_WRITING_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </PreviewCard>
          <PreviewCard title="实践建议">
            <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
              <li>先确定文档属于哪一类，再决定 frontmatter 该写哪些字段。</li>
              <li>列表页要读到的信息写在 frontmatter，细节、过程、案例写在正文。</li>
              <li>如果你发现某个字段只为单篇文档服务，通常说明它更适合写进正文。</li>
              <li>帮助页里的示例文档应该接近真实发布内容，而不是只有字段占位。</li>
            </ul>
          </PreviewCard>
        </div>
      </Section>

      {FRONTMATTER_HELP_EXAMPLES.map((example) => (
        <Section id={example.id} title={example.title} key={example.id}>
          <p className="text-sm text-[var(--color-text)] leading-relaxed mb-4">
            {example.suitableFor}
          </p>
          <ExampleGuidance example={example} />
          <div className="flex items-center justify-between gap-3 mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <p className="text-xs text-[var(--color-text-muted)]">
              可在独立窗口中同时查看原始文档和真实渲染结果。
            </p>
            <button
              type="button"
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleOpenExampleWindow(example.id)}
              disabled={openingExampleId === example.id}
            >
              {openingExampleId === example.id
                ? "正在打开..."
                : "在新窗口中查看"}
            </button>
          </div>
          {windowError?.exampleId === example.id && (
            <p className="mb-4 text-xs text-[var(--color-danger)]">
              打开独立窗口失败：{windowError.message}
            </p>
          )}
          <SideBySideExample
            title={`${example.title} 完整示例`}
            description={example.description}
            code={example.raw}
            preview={<FrontmatterHelpExamplePreview example={example} />}
            previewTitle="渲染效果（真实预览）"
          />
        </Section>
      ))}

      <Section id="frontmatter-faq" title="Frontmatter 解析注意事项">
        <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
          {FRONTMATTER_FAQ.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

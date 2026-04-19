import { useMemo, useState } from "react";
import { openExamplePreviewWindow } from "@/features/examplePreview/openExamplePreviewWindow";
import { FrontmatterHelpExampleSection } from "./FrontmatterHelpExampleSection";
import { FrontmatterHelpTypeBrowser } from "./FrontmatterHelpTypeBrowser";
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
} from "./frontmatterHelpData";

export function FrontmatterHelpTab() {
  const [activeType, setActiveType] = useState(FRONTMATTER_HELP_EXAMPLES[0].type);
  const [openingExampleId, setOpeningExampleId] = useState<string | null>(null);
  const [windowError, setWindowError] = useState<{
    exampleId: string;
    message: string;
  } | null>(null);

  const activeExample = useMemo(
    () =>
      FRONTMATTER_HELP_EXAMPLES.find((example) => example.type === activeType) ??
      FRONTMATTER_HELP_EXAMPLES[0],
    [activeType]
  );

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
    <div className="min-w-0">
      <Section id="frontmatter-support" title="说明">
        <p className="break-words text-sm leading-relaxed text-[var(--color-text)]">
          支持 YAML frontmatter（文件开头的{" "}
          <code className="font-mono">---</code> 区块）。应用会先把
          frontmatter 解析为元数据，再根据不同内容类型决定头部、列表卡片和特殊预览如何显示；正文部分继续按
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
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
          <PreviewCard title="写作原则">
            <ul className="break-words list-disc space-y-1 pl-5 text-sm text-[var(--color-text)]">
              {FRONTMATTER_WRITING_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </PreviewCard>
          <PreviewCard title="实践建议">
            <ul className="break-words list-disc space-y-1 pl-5 text-sm text-[var(--color-text)]">
              <li>先确定文档属于哪一类，再决定 frontmatter 该写哪些字段。</li>
              <li>列表页要读到的信息写在 frontmatter，细节、过程、案例写在正文。</li>
              <li>如果某个字段只为单篇文档服务，通常说明它更适合写进正文。</li>
              <li>帮助页里的示例文档应该接近真实发布内容，而不是只有字段占位。</li>
            </ul>
          </PreviewCard>
        </div>
      </Section>

      <FrontmatterHelpTypeBrowser
        activeType={activeType}
        examples={FRONTMATTER_HELP_EXAMPLES}
        onSelect={setActiveType}
      />

      <FrontmatterHelpExampleSection
        example={activeExample}
        openingExampleId={openingExampleId}
        windowError={windowError}
        onOpenExampleWindow={handleOpenExampleWindow}
      />

      <Section id="frontmatter-faq" title="Frontmatter 解析注意事项">
        <ul className="break-words list-disc space-y-1 pl-5 text-sm text-[var(--color-text)]">
          {FRONTMATTER_FAQ.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

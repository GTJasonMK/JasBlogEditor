import { useState, useRef, useEffect, useCallback } from 'react';
import { useSettingsStore } from '@/store';
import { LLMClient } from '@/services/llm';
import type { ChatMessage } from '@/services/llm';
import type { ContentType } from '@/types';

type AIAction = 'continue' | 'polish' | 'summary' | 'translate' | 'custom';

interface AIAssistantPanelProps {
  visible: boolean;
  onClose: () => void;
  content: string;
  selectedText: string;
  fileType: ContentType;
  onInsert: (text: string) => void;
  onReplace: (text: string) => void;
}

const ACTION_LABELS: Record<AIAction, string> = {
  continue: '续写',
  polish: '润色',
  summary: '摘要',
  translate: '翻译',
  custom: '自定义',
};

// ===== Markdown 渲染能力描述（所有内容类型共享） =====

const MARKDOWN_CAPABILITIES = `你正在为一个 Markdown 博客编辑器生成内容。输出必须是纯 Markdown 格式。

支持的 Markdown 扩展语法：
- GFM：表格、任务列表 \`- [ ]\`/\`- [x]\`、删除线 \`~~text~~\`、脚注
- 代码块：\`\`\`lang 围栏语法，支持语法高亮
- KaTeX 数学公式：行内 \`$E=mc^2$\`，块级用独立行 \`$$\` 包裹
- Mermaid 图表：\`\`\`mermaid 代码块（flowchart、sequenceDiagram、classDiagram 等）
- GitHub 风格提示块：\`> [!NOTE]\`、\`> [!TIP]\`、\`> [!IMPORTANT]\`、\`> [!WARNING]\`、\`> [!CAUTION]\`
- 图片支持 alt 文本作为图注
- 标题 H1-H4 自动生成锚点`;

// ===== 各内容类型的写作风格指导 =====

const TYPE_CONTEXT: Record<ContentType, string> = {
  note: `当前编辑的是「学习笔记」类型。写作风格要求：
- 结构清晰，善用标题层级（H2/H3）组织内容
- 代码示例使用围栏代码块并标注语言
- 重要概念用加粗或提示块 \`> [!NOTE]\` 强调
- 适合使用表格对比、KaTeX 公式、Mermaid 图表等丰富表达
- 典型结构：前言 → 分步骤/分主题展开 → 总结`,

  project: `当前编辑的是「开源项目」介绍。写作风格要求：
- 简洁专业的技术文档风格
- 功能特性用无序列表罗列
- 代码示例标注语言，展示关键用法
- 典型结构：项目简介 → 功能特性 → 快速开始 → 项目结构 → 开发计划`,

  diary: `当前编辑的是「日记」类型。写作风格要求：
- 个人化、叙事性的文风，可以感性表达
- 记录见闻、感受、反思
- 可使用引用块记录对话或印象深刻的句子
- 适当使用列表记录行程或花费
- 典型结构：经历描述 → 感受/反思 → 收获/计划`,

  roadmap: `当前编辑的是「规划」类型。正文使用特殊的任务语法，必须严格遵守：
- 任务行格式：\`- [ ] 任务描述 \\\`priority\\\`\`（priority: high/medium/low）
- 任务状态：\`- [ ]\` 待办、\`- [-]\` 进行中、\`- [x]\` 已完成
- 缩进行归属当前任务：\`描述:\`、\`详情:\`（后跟缩进列表）、\`截止:\`、\`完成:\`
- 可用 H2 标题分阶段
- 示例：
  \`\`\`
  ## 第一阶段
  - [ ] 核心功能开发 \\\`high\\\`
    描述: 完成核心模块
    截止: 2026-03-01
  - [-] 文档编写 \\\`medium\\\`
  - [x] 环境搭建 \\\`low\\\`
    完成: 2026-02-15
  \`\`\``,

  graph: `当前编辑的是「知识图谱」类型。图谱数据存在 \\\`\\\`\\\`graph 代码块中（JSON 格式），正文其余部分按普通 Markdown 渲染。
- 不要修改 \\\`\\\`\\\`graph 代码块中的 JSON 数据
- 仅对代码块之外的说明文字进行操作`,

  doc: `当前编辑的是普通文档。写作风格灵活，支持全部 Markdown 扩展语法。`,
};

/** 根据动作、文件类型和内容构建消息列表 */
function buildMessages(
  action: AIAction,
  content: string,
  selectedText: string,
  customPrompt: string,
  fileType: ContentType,
): ChatMessage[] {
  const context = selectedText || content;
  const tail500 = content.length > 500 ? content.slice(-500) : content;
  const typeHint = TYPE_CONTEXT[fileType] || TYPE_CONTEXT.doc;

  switch (action) {
    case 'continue':
      return [
        {
          role: 'system',
          content: `${MARKDOWN_CAPABILITIES}\n\n${typeHint}\n\n你是写作助手。请根据上下文续写内容，保持与前文一致的风格和 Markdown 格式。直接输出续写的内容，不要重复已有内容。注意：提供的文本可能是文档中间截断的片段，请根据文体自然延续。`,
        },
        { role: 'user', content: `请续写以下内容：\n\n${tail500}` },
      ];
    case 'polish':
      return [
        {
          role: 'system',
          content: `${MARKDOWN_CAPABILITIES}\n\n${typeHint}\n\n你是写作润色专家。请优化以下文字的表达，保持原意不变。保留原有的 Markdown 格式（标题、列表、代码块、公式等），可以适当使用项目支持的扩展语法增强表达。直接输出润色后的完整内容。`,
        },
        { role: 'user', content: context },
      ];
    case 'summary':
      return [
        {
          role: 'system',
          content: `${MARKDOWN_CAPABILITIES}\n\n${typeHint}\n\n你是内容总结专家。请用 Markdown 格式生成简洁的摘要。可以使用列表、加粗等格式突出要点。`,
        },
        { role: 'user', content: `请为以下内容生成摘要：\n\n${context}` },
      ];
    case 'translate':
      return [
        {
          role: 'system',
          content: `${MARKDOWN_CAPABILITIES}\n\n你是翻译专家。如果内容主要是中文，翻译为英文；如果主要是英文，翻译为中文。保留原有的 Markdown 格式（标题层级、列表、代码块、公式、链接等不翻译）。直接输出翻译结果。`,
        },
        { role: 'user', content: context },
      ];
    case 'custom':
      return [
        {
          role: 'system',
          content: `${MARKDOWN_CAPABILITIES}\n\n${typeHint}\n\n你是 AI 写作助手。请根据用户指令处理内容，输出 Markdown 格式。`,
        },
        { role: 'user', content: `${customPrompt}\n\n---\n\n${context}` },
      ];
  }
}

export function AIAssistantPanel({
  visible,
  onClose,
  content,
  selectedText,
  fileType,
  onInsert,
  onReplace,
}: AIAssistantPanelProps) {
  const { settings } = useSettingsStore();

  const [action, setAction] = useState<AIAction | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [result, setResult] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);

  // 使用 ref 跟踪当前生成是否应中断
  const cancelledRef = useRef(false);
  const resultRef = useRef('');

  // 同步 result 到 ref（供回调使用）
  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  // 组件隐藏时重置状态
  useEffect(() => {
    if (!visible) {
      cancelledRef.current = true;
      setAction(null);
      setResult('');
      setReasoning('');
      setIsGenerating(false);
      setError(null);
      setCustomPrompt('');
    }
  }, [visible]);

  const handleGenerate = useCallback(async (selectedAction: AIAction) => {
    if (!settings.llm?.apiKey) {
      setError('请先在设置中配置 API Key');
      return;
    }

    if (selectedAction === 'custom' && !customPrompt.trim()) {
      setError('请输入自定义指令');
      return;
    }

    // 重置状态
    cancelledRef.current = false;
    setResult('');
    setReasoning('');
    setError(null);
    setIsGenerating(true);
    setAction(selectedAction);

    try {
      const client = LLMClient.createFromConfig(
        {
          apiKey: settings.llm.apiKey,
          baseUrl: settings.llm.baseUrl,
          model: settings.llm.model,
        },
        true,
        true,
      );

      const messages = buildMessages(selectedAction, content, selectedText, customPrompt, fileType);
      const stream = client.streamChat({
        messages,
        model: settings.llm.model || 'gpt-3.5-turbo',
        temperature: 0.7,
        timeout: 120,
      });

      for await (const chunk of stream) {
        if (cancelledRef.current) break;

        if (chunk.content) {
          setResult((prev) => prev + chunk.content);
        }
        if (chunk.reasoningContent) {
          setReasoning((prev) => prev + chunk.reasoningContent);
        }
      }
    } catch (e) {
      if (!cancelledRef.current) {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (!cancelledRef.current) {
        setIsGenerating(false);
      }
    }
  }, [settings.llm, content, selectedText, customPrompt]);

  const handleCancel = () => {
    cancelledRef.current = true;
    setIsGenerating(false);
  };

  const handleInsert = () => {
    if (resultRef.current) {
      onInsert(resultRef.current);
    }
  };

  const handleReplace = () => {
    if (resultRef.current) {
      onReplace(resultRef.current);
    }
  };

  const handleCopy = async () => {
    if (resultRef.current) {
      await navigator.clipboard.writeText(resultRef.current);
    }
  };

  const handleRegenerate = () => {
    if (action) {
      handleGenerate(action);
    }
  };

  if (!visible) return null;

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-paper)] flex flex-col" style={{ height: '280px' }}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
        <span className="text-sm font-medium">AI 助手</span>
        <button
          onClick={onClose}
          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded transition-colors"
          title="关闭"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 操作按钮行 */}
      <div className="flex items-center gap-2 px-4 py-2">
        {(Object.keys(ACTION_LABELS) as AIAction[]).map((key) => (
          <button
            key={key}
            onClick={() => {
              if (key === 'custom') {
                setAction('custom');
              } else {
                handleGenerate(key);
              }
            }}
            disabled={isGenerating}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              action === key
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
            } disabled:opacity-50`}
          >
            {ACTION_LABELS[key]}
          </button>
        ))}

        {selectedText && (
          <span className="text-xs text-[var(--color-text-muted)] ml-2">
            已选中 {selectedText.length} 字
          </span>
        )}
      </div>

      {/* 自定义 prompt 输入框 */}
      {action === 'custom' && !isGenerating && !result && (
        <div className="px-4 pb-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="输入自定义指令，如：改写为更正式的语气"
              className="flex-1 px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text)]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customPrompt.trim()) {
                  handleGenerate('custom');
                }
              }}
            />
            <button
              onClick={() => handleGenerate('custom')}
              disabled={!customPrompt.trim()}
              className="px-3 py-1.5 text-xs bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-dark)] disabled:opacity-50 transition-colors"
            >
              发送
            </button>
          </div>
        </div>
      )}

      {/* 输出区域 */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-2">
        {error && (
          <div className="px-3 py-2 mb-2 rounded-md text-sm bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {reasoning && (
          <div className="mb-2">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {showReasoning ? '▼' : '▶'} 思考过程
            </button>
            {showReasoning && (
              <pre className="mt-1 px-3 py-2 text-xs bg-[var(--color-surface)] rounded-md whitespace-pre-wrap text-[var(--color-text-muted)] max-h-24 overflow-auto">
                {reasoning}
              </pre>
            )}
          </div>
        )}

        {(result || isGenerating) && (
          <div className="text-sm whitespace-pre-wrap text-[var(--color-text)]">
            {result}
            {isGenerating && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-[var(--color-primary)] animate-pulse" />
            )}
          </div>
        )}

        {!result && !isGenerating && !error && !action && (
          <div className="text-sm text-[var(--color-text-muted)] py-4 text-center">
            选择操作开始使用 AI 助手
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {(result || isGenerating) && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-[var(--color-border)]">
          {!isGenerating && (
            <>
              <button
                onClick={handleInsert}
                className="px-3 py-1 text-xs bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                插入到光标位置
              </button>
              {selectedText && (
                <button
                  onClick={handleReplace}
                  className="px-3 py-1 text-xs bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] rounded-md transition-colors"
                >
                  替换选中内容
                </button>
              )}
              <button
                onClick={handleCopy}
                className="px-3 py-1 text-xs bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] rounded-md transition-colors"
              >
                复制
              </button>
              <button
                onClick={handleRegenerate}
                className="px-3 py-1 text-xs bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] rounded-md transition-colors"
              >
                重新生成
              </button>
            </>
          )}
          {isGenerating && (
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] rounded-md transition-colors"
            >
              取消生成
            </button>
          )}
        </div>
      )}
    </div>
  );
}

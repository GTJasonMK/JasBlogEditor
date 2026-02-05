/**
 * 内容预览组件
 * 还原 JasBlog 各类型页面的完整渲染效果
 */

import type { EditorFile } from '@/types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CONTENT_TYPE_UI } from '@/config/contentTypeUi';

interface ContentPreviewProps {
  file: EditorFile;
  bodyContent: string; // 去掉 frontmatter 的正文内容
}

export function ContentPreview({ file, bodyContent }: ContentPreviewProps) {
  const config = CONTENT_TYPE_UI[file.type];
  if (config) return config.renderPreview(file, bodyContent);

  // 理论上不会走到这里：ContentType 已被穷举
  return (
    <article className="prose-chinese">
      <MarkdownRenderer content={bodyContent} />
    </article>
  );
}

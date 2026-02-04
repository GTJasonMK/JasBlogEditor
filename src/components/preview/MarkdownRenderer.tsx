import { useState, useCallback, useMemo, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { MermaidDiagram } from "./MermaidDiagram";
import { extractText, generateId } from "@/utils";

// 预处理 Alert 语法，将 > [!TYPE] 转换为特殊标记
// 使用 ALERTBOXTYPEALERTBOX 格式避免被 Markdown 解析（与 JasBlog 保持一致）
function preprocessAlerts(content: string): string {
  // 处理 Windows (\r\n) 和 Unix (\n) 换行符
  return content.replace(
    /^(>\s*)\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\r?\n?/gm,
    "$1ALERTBOX$2ALERTBOX\n"
  );
}

// 代码块复制按钮组件
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
      style={{
        background: "rgba(255,255,255,0.1)",
        color: "#cdd6f4",
        border: "1px solid rgba(255,255,255,0.15)",
      }}
      aria-label="Copy code"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// 图片缩放组件
function ImageZoom({ src, alt }: { src?: string | undefined; alt?: string }) {
  const [zoomed, setZoomed] = useState(false);

  if (!src || typeof src !== "string") return null;

  return (
    <>
      <span className="block my-6">
        <img
          src={src}
          alt={alt || ""}
          className="rounded-lg max-w-full h-auto mx-auto cursor-zoom-in"
          loading="lazy"
          onClick={() => setZoomed(true)}
        />
        {alt && (
          <span className="block text-center text-sm text-[var(--color-gray)] mt-2">
            {alt}
          </span>
        )}
      </span>
      {/* 图片缩放蒙层 */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-zoom-out"
          onClick={() => setZoomed(false)}
        >
          <img
            src={src}
            alt={alt || ""}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}

// 解析 blockquote 中的 Alert 标记
function parseAlertFromChildren(children: ReactNode): {
  type: string;
  content: ReactNode;
} | null {
  if (!children) return null;

  const childArray = Array.isArray(children) ? children : [children];

  // 遍历所有子元素，查找 Alert 标记
  for (let i = 0; i < childArray.length; i++) {
    const child = childArray[i];
    if (!child) continue;

    // 提取文本内容
    const text = extractText(child);

    // 检查是否包含 ALERTBOXTYPEALERTBOX 标记（与 JasBlog 保持一致）
    const alertMatch = text.match(/^ALERTBOX(NOTE|TIP|IMPORTANT|WARNING|CAUTION)ALERTBOX\s*/i);
    if (alertMatch) {
      const alertType = alertMatch[1].toLowerCase();

      // 获取标记之后的内容（如果有的话）
      const restText = text.slice(alertMatch[0].length).trim();
      // 获取剩余的子元素
      const restChildren = childArray.slice(i + 1);

      return {
        type: alertType,
        content: (
          <>
            {restText && <p>{restText}</p>}
            {restChildren}
          </>
        ),
      };
    }
  }

  return null;
}

// GitHub 风格 alert 类型配置
const ALERT_CONFIG: Record<
  string,
  { label: string; className: string; icon: string }
> = {
  note: {
    label: "Note",
    className: "alert-note",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  },
  tip: {
    label: "Tip",
    className: "alert-tip",
    icon: "M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z",
  },
  important: {
    label: "Important",
    className: "alert-important",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z",
  },
  warning: {
    label: "Warning",
    className: "alert-warning",
    icon: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  },
  caution: {
    label: "Caution",
    className: "alert-caution",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.54-12.46L12 11.08 8.46 7.54 7.04 8.96 10.58 12.5l-3.54 3.54 1.42 1.42L12 13.92l3.54 3.54 1.42-1.42L13.42 12.5l3.54-3.54-1.42-1.42z",
  },
};

// 标题组件（带锚点链接）
function Heading({
  level,
  children,
  ...props
}: {
  level: 1 | 2 | 3 | 4;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  const text = extractText(children);
  const id = generateId(text);
  const Tag = `h${level}` as const;

  return (
    <Tag id={id} className="group/heading relative" {...props}>
      {children}
      <a
        href={`#${id}`}
        className="heading-anchor"
        aria-label={`Link to ${text}`}
        onClick={(e) => {
          e.preventDefault();
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
          history.replaceState(null, "", `#${id}`);
        }}
      >
        #
      </a>
    </Tag>
  );
}

// 代码块组件（支持 Mermaid）
function CodeBlock({ children }: { children?: ReactNode }) {
  // 从 children 中提取代码和语言
  let code = "";
  let language = "";
  if (children && typeof children === "object" && "props" in children) {
    const codeElement = children as {
      props: { children?: ReactNode; className?: string };
    };
    code = extractText(codeElement.props?.children);
    const className = codeElement.props?.className || "";
    const langMatch = className.match(/language-(\w+)/);
    language = langMatch ? langMatch[1] : "";
  }

  // Mermaid 图表
  if (language === "mermaid") {
    return (
      <div className="my-6">
        <MermaidDiagram code={code} />
      </div>
    );
  }

  // 普通代码块
  return (
    <div className="code-block-wrapper group">
      {language && <span className="code-block-lang">{language}</span>}
      <CopyButton code={code} />
      <pre>{children}</pre>
    </div>
  );
}

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // 预处理 Alert 语法
  const processedContent = useMemo(() => preprocessAlerts(content), [content]);

  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeHighlight, rehypeKatex]}
      components={{
        // 标题
        h1: ({ children, ...props }) => (
          <Heading level={1} {...props}>
            {children}
          </Heading>
        ),
        h2: ({ children, ...props }) => (
          <Heading level={2} {...props}>
            {children}
          </Heading>
        ),
        h3: ({ children, ...props }) => (
          <Heading level={3} {...props}>
            {children}
          </Heading>
        ),
        h4: ({ children, ...props }) => (
          <Heading level={4} {...props}>
            {children}
          </Heading>
        ),
        // 链接
        a: ({ href, children, ...props }) => {
          const isExternal = href?.startsWith("http");
          return (
            <a
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              {...props}
            >
              {children}
            </a>
          );
        },
        // 图片（可缩放）
        img: ({ src, alt }) => {
          const imgSrc = typeof src === "string" ? src : undefined;
          return <ImageZoom src={imgSrc} alt={alt} />;
        },
        // 代码块（带复制按钮、语言标签、Mermaid 支持）
        pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
        // 引用块（支持 GitHub alert）
        blockquote: ({ children, ...props }) => {
          // 解析预处理后的 Alert 标记
          const alert = parseAlertFromChildren(children);
          if (alert && ALERT_CONFIG[alert.type]) {
            const { label, className, icon } = ALERT_CONFIG[alert.type];
            return (
              <div className={`github-alert ${className}`}>
                <div className="github-alert-title">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="currentColor"
                  >
                    <path d={icon} />
                  </svg>
                  {label}
                </div>
                <div className="github-alert-content">{alert.content}</div>
              </div>
            );
          }
          return <blockquote {...props}>{children}</blockquote>;
        },
        // 表格
        table: ({ children, ...props }) => (
          <div className="overflow-x-auto my-6">
            <table {...props}>{children}</table>
          </div>
        ),
      }}
    >
      {processedContent}
    </Markdown>
  );
}

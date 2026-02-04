import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

// 浅色主题配置
const lightThemeVariables = {
  primaryColor: "#fdf5e8",
  primaryTextColor: "#2c2c2c",
  primaryBorderColor: "#c94043",
  lineColor: "#6b6b6b",
  secondaryColor: "#f5f0e8",
  tertiaryColor: "#fff",
  fontFamily: '"Noto Serif SC", serif',
};

// 深色主题配置
const darkThemeVariables = {
  primaryColor: "#2a2a2e",
  primaryTextColor: "#e8e6e3",
  primaryBorderColor: "#c94043",
  lineColor: "#8a8680",
  secondaryColor: "#1e1e22",
  tertiaryColor: "#161619",
  fontFamily: '"Noto Serif SC", serif',
};

// 初始化 mermaid（使用函数，根据主题动态配置）
function initMermaid(isDark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    themeVariables: isDark ? darkThemeVariables : lightThemeVariables,
    flowchart: {
      htmlLabels: true,
      curve: "basis",
    },
    sequence: {
      diagramMarginX: 50,
      diagramMarginY: 10,
      actorMargin: 50,
      width: 150,
      height: 65,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 35,
    },
  });
}

// 检测当前是否为深色模式
function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

interface MermaidDiagramProps {
  code: string;
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [currentTheme, setCurrentTheme] = useState<boolean>(isDarkMode());

  // 监听主题变化
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const newTheme = isDarkMode();
          if (newTheme !== currentTheme) {
            setCurrentTheme(newTheme);
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [currentTheme]);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim()) return;

      try {
        // 根据当前主题初始化 mermaid
        initMermaid(currentTheme);

        // 生成唯一 ID
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code.trim());
        setSvg(svg);
        setError("");
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
        setSvg("");
      }
    };

    renderDiagram();
  }, [code, currentTheme]);

  if (error) {
    return (
      <div className="mermaid-error">
        <div className="mermaid-error-title">Diagram Error</div>
        <pre className="mermaid-error-message">{error}</pre>
        <pre className="mermaid-error-code">{code}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="mermaid-loading">
        Loading diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

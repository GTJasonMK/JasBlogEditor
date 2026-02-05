import { useEffect } from "react";
import type { ThemeMode } from "@/types";
import { applyTheme, setupSystemThemeListener } from "@/utils";

/**
 * 主题初始化 + 系统主题变化监听
 */
export function useThemeEffect(theme: ThemeMode | undefined): void {
  useEffect(() => {
    const mode = theme || "system";
    applyTheme(mode);

    // 当主题为 system 时，监听系统主题变化
    if (mode === "system") {
      return setupSystemThemeListener(() => applyTheme("system"));
    }
  }, [theme]);
}


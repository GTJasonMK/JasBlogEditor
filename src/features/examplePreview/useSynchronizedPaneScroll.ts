import { useEffect, useRef, type RefObject } from "react";

function syncPaneScroll(source: HTMLDivElement, target: HTMLDivElement) {
  const sourceScrollable = source.scrollHeight - source.clientHeight;
  const targetScrollable = target.scrollHeight - target.clientHeight;

  if (sourceScrollable <= 0 || targetScrollable <= 0) {
    target.scrollTop = 0;
    return;
  }

  const ratio = source.scrollTop / sourceScrollable;
  target.scrollTop = ratio * targetScrollable;
}

export function useSynchronizedPaneScroll(
  enabled: boolean,
  leftRef: RefObject<HTMLDivElement | null>,
  rightRef: RefObject<HTMLDivElement | null>
) {
  const syncingRef = useRef<"left" | "right" | null>(null);

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!enabled || !left || !right) {
      return;
    }

    const handleLeftScroll = () => {
      if (syncingRef.current === "right") return;
      syncingRef.current = "left";
      syncPaneScroll(left, right);
      syncingRef.current = null;
    };

    const handleRightScroll = () => {
      if (syncingRef.current === "left") return;
      syncingRef.current = "right";
      syncPaneScroll(right, left);
      syncingRef.current = null;
    };

    left.addEventListener("scroll", handleLeftScroll);
    right.addEventListener("scroll", handleRightScroll);
    return () => {
      left.removeEventListener("scroll", handleLeftScroll);
      right.removeEventListener("scroll", handleRightScroll);
    };
  }, [enabled, leftRef, rightRef]);
}

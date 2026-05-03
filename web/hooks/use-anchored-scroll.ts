"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AnchoredScrollOptions = {
  bottomThreshold?: number;
  defaultBehavior?: ScrollBehavior;
};

type RequestScrollOptions = {
  behavior?: ScrollBehavior;
  force?: boolean;
};

export function useAnchoredScroll<T extends HTMLElement>({
  bottomThreshold = 96,
  defaultBehavior = "smooth",
}: AnchoredScrollOptions = {}) {
  const scrollContainerRef = useRef<T | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pinnedToBottomRef = useRef(true);
  const frameRef = useRef<number | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewContent, setHasNewContent] = useState(false);

  const isNearBottom = useCallback(() => {
    const node = scrollContainerRef.current;
    if (!node) return true;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    return distanceFromBottom <= bottomThreshold;
  }, [bottomThreshold]);

  const setPinnedState = useCallback(
    (nextPinned: boolean) => {
      pinnedToBottomRef.current = nextPinned;
      setIsAtBottom(nextPinned);
      if (nextPinned) {
        setHasNewContent(false);
      }
    },
    [],
  );

  const handleScroll = useCallback(() => {
    setPinnedState(isNearBottom());
  }, [isNearBottom, setPinnedState]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = defaultBehavior) => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ block: "end", behavior });
        setPinnedState(true);
        frameRef.current = null;
      });
    },
    [defaultBehavior, setPinnedState],
  );

  const requestScrollOnContentChange = useCallback(
    ({ behavior, force = false }: RequestScrollOptions = {}) => {
      if (force || pinnedToBottomRef.current) {
        scrollToBottom(behavior || defaultBehavior);
        return;
      }

      setHasNewContent(true);
      setIsAtBottom(false);
    },
    [defaultBehavior, scrollToBottom],
  );

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return {
    bottomRef,
    hasNewContent,
    handleScroll,
    isAtBottom,
    requestScrollOnContentChange,
    scrollContainerRef,
    scrollToBottom,
  };
}

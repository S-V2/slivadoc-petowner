"use client";
import { useEffect, useRef, useState } from "react";
import { PET_HUB_STORY_DURATION_MS } from "./pethub-interactions";

// Count visible, playable time only. A held/hidden/buffering story is paused.
export function useStoryClock(id: string, paused: boolean, onEnd: () => void) {
  const clock = useRef({ id, elapsed: 0, ended: false });
  const complete = useRef(onEnd);
  const [display, setDisplay] = useState({ id, elapsed: 0 });
  useEffect(() => {
    complete.current = onEnd;
  }, [onEnd]);
  useEffect(() => {
    if (clock.current.id !== id)
      clock.current = { id, elapsed: 0, ended: false };
    if (paused || clock.current.ended) return;
    let previous = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      clock.current.elapsed = Math.min(
        PET_HUB_STORY_DURATION_MS,
        clock.current.elapsed + Math.max(0, now - previous),
      );
      previous = now;
      setDisplay({ id, elapsed: clock.current.elapsed });
      if (
        clock.current.elapsed >= PET_HUB_STORY_DURATION_MS &&
        !clock.current.ended
      ) {
        clock.current.ended = true;
        clearInterval(timer);
        complete.current();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [id, paused]);
  return display.id === id ? display.elapsed : 0;
}

import { useState, useEffect, useRef } from 'react';

interface UseSpeechOptions {
  lines: string[];
  /** Delay before first line (ms) */
  delay?: number;
  /** Interval between lines (ms) */
  interval?: number;
  /** How long text stays after typing finishes (ms) */
  displayDuration?: number;
  /** Typing speed (ms per character) */
  typeSpeed?: number;
}

interface SpeechState {
  visible: boolean;
  text: string;
  typing: boolean;
}

export function useSpeech({ lines, delay = 3000, interval = 8000, displayDuration = 3500, typeSpeed = 25 }: UseSpeechOptions): SpeechState {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const linesRef = useRef(lines);
  const usedRef = useRef<Set<number>>(new Set());
  const typeTimerRef = useRef<number>(0);
  const hideTimerRef = useRef<number>(0);

  // Keep lines ref fresh without triggering effect
  linesRef.current = lines;

  useEffect(() => {
    function pickLine(): string {
      const pool = linesRef.current;
      if (usedRef.current.size >= pool.length) usedRef.current.clear();
      let idx: number;
      do { idx = Math.floor(Math.random() * pool.length); } while (usedRef.current.has(idx));
      usedRef.current.add(idx);
      return pool[idx];
    }

    function showLine() {
      const line = pickLine();
      setText('');
      setTyping(true);
      setVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

      let i = 0;
      if (typeTimerRef.current) clearInterval(typeTimerRef.current);
      typeTimerRef.current = window.setInterval(() => {
        i++;
        setText(line.slice(0, i));
        if (i >= line.length) {
          clearInterval(typeTimerRef.current);
          setTyping(false);
          hideTimerRef.current = window.setTimeout(() => setVisible(false), displayDuration);
        }
      }, typeSpeed);
    }

    const initialTimer = setTimeout(showLine, delay);
    const cycleTimer = setInterval(showLine, interval);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(cycleTimer);
      if (typeTimerRef.current) clearInterval(typeTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [delay, interval, displayDuration, typeSpeed]);

  return { visible, text, typing };
}

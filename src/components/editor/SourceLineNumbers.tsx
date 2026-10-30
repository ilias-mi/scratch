import {
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type RefObject,
} from "react";

interface SourceLineNumbersProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  lineCount: number;
  textStyle: CSSProperties;
}

// Gutter for the source textarea. The textarea scrolls itself, so the numbers follow it by writing
// `transform` directly, which keeps scrolling free of React renders.
export function SourceLineNumbers({
  textareaRef,
  lineCount,
  textStyle,
}: SourceLineNumbersProps) {
  const numbersRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const numbers = numbersRef.current;
    if (!textarea || !numbers) return;

    const sync = () => {
      numbers.style.transform = `translateY(${-textarea.scrollTop}px)`;
    };
    sync();
    textarea.addEventListener("scroll", sync, { passive: true });
    return () => textarea.removeEventListener("scroll", sync);
  }, [textareaRef]);

  const text = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join("\n"),
    [lineCount],
  );

  return (
    <div className="source-line-numbers" aria-hidden="true" style={textStyle}>
      <div ref={numbersRef}>{text}</div>
    </div>
  );
}

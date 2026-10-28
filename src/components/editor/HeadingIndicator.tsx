import { memo, useEffect, useRef, useState, type RefObject } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { cn } from "../../lib/utils";
import type { HeadingIndicatorMode } from "../../types/note";

/** Headings shown on each side of the focused one. */
const NEIGHBOR_COUNT = 3;
/** A heading counts as focused once its top passes this fraction of the viewport height. */
const FOCUS_LINE_RATIO = 0.3;
/** Vertical distance between consecutive rows, and the space between them. */
const ROW_HEIGHT_PX = 24;
const ROW_GAP_PX = 8;
/** Gap to the text column over which the indicator fades out before it would overlap. */
const FADE_DISTANCE_PX = 32;
interface HeadingEntry {
  pos: number;
  level: number;
  /** Hierarchical number such as "1", "1.2" or "1.2.1"; empty for H1. */
  label: string;
}

interface HeadingIndicatorProps {
  editor: TiptapEditor;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  mode: HeadingIndicatorMode;
}

/**
 * Numbers headings like an outline: H2s count from 1 within each H1, H3s within each H2, and so on.
 * H1s carry no number.
 */
function collectHeadings(editor: TiptapEditor): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  // counters[level] is the running count for that level within the current parent (index 0 unused)
  const counters = [0, 0, 0, 0, 0, 0, 0];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return true;
    const level = node.attrs.level as number;

    if (level === 1) {
      counters.fill(0);
    } else {
      counters[level]++;
      counters.fill(0, level + 1);
    }

    const label = level === 1 ? "" : counters.slice(2, level + 1).filter((n) => n > 0).join(".");
    headings.push({ pos, level, label });
    return false;
  });
  return headings;
}

function HeadingRow({
  level,
  label,
  isActive,
  onSelect,
}: Omit<HeadingEntry, "pos"> & { isActive: boolean; onSelect: () => void }) {
  // H1 has no number, so a line takes its place in the same right-aligned column
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={`Go to heading ${label || level}`}
      onClick={onSelect}
      className="pointer-events-auto cursor-pointer"
    >
      <span
        className={cn(
          "flex min-w-6 justify-end text-2xs font-medium tabular-nums transition-all duration-150",
          isActive ? "text-text" : "text-text-muted/60",
        )}
        style={{ textShadow: isActive ? "0 0 6px var(--color-text)" : undefined }}
      >
        {level === 1 ? (
          <div
            className={cn(
              "w-7 h-0.5 self-center rounded-full transition-colors duration-150",
              isActive ? "bg-text" : "bg-text-muted/40",
            )}
            style={{ boxShadow: isActive ? "0 0 6px var(--color-text)" : undefined }}
          />
        ) : (
          label
        )}
      </span>
    </button>
  );
}

/**
 * Right-edge indicator of the heading currently in view. Each heading is shown by its outline number.
 * - "focused": vertically centered, the focused heading plus its nearest neighbors
 * - "outline": top-aligned, all headings, auto-scrolled to keep the focused one in view
 * It never receives pointer events, so wheel scrolling always reaches the note.
 */
export const HeadingIndicator = memo(function HeadingIndicator({
  editor,
  scrollContainerRef,
  mode,
}: HeadingIndicatorProps) {
  const [headings, setHeadings] = useState<HeadingEntry[]>(() => collectHeadings(editor));
  const [activeIndex, setActiveIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [outlineHeight, setOutlineHeight] = useState(0);
  const indicatorRef = useRef<HTMLDivElement>(null);
  // Clicking or typing makes the cursor's section focused; wheel scrolling hands focus back to the viewport
  const followCursorRef = useRef(false);

  const jumpToHeading = (pos: number) => {
    editor.chain().focus().setTextSelection(pos + 1).run();
    const element = editor.view.nodeDOM(pos);
    if (element instanceof HTMLElement) {
      element.scrollIntoView({ block: "start" });
    }
  };

  // Keep the heading list in sync with the document
  useEffect(() => {
    const handleUpdate = () => setHeadings(collectHeadings(editor));
    handleUpdate();
    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor]);

  // Track which heading is focused: the cursor's section after editing, otherwise the scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || headings.length === 0) return;

    let frame = 0;
    const updateActive = () => {
      frame = 0;
      if (followCursorRef.current) {
        const cursor = editor.state.selection.from;
        let index = 0;
        for (let i = 0; i < headings.length && headings[i].pos <= cursor; i++) index = i;
        setActiveIndex(index);
        return;
      }
      const focusLine =
        container.getBoundingClientRect().top + container.clientHeight * FOCUS_LINE_RATIO;
      let index = 0;
      for (let i = 0; i < headings.length; i++) {
        const dom = editor.view.nodeDOM(headings[i].pos);
        if (!(dom instanceof HTMLElement)) continue;
        if (dom.getBoundingClientRect().top > focusLine) break;
        index = i;
      }
      // The last headings may never reach the focus line, so the bottom of the note focuses the last one
      if (container.scrollTop > 0 && container.scrollTop + container.clientHeight >= container.scrollHeight - 1) {
        index = headings.length - 1;
      }
      setActiveIndex(index);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(updateActive);
    };
    const followCursor = () => {
      followCursorRef.current = true;
      scheduleUpdate();
    };
    // Only real wheel/trackpad input counts: typing can scroll the note to keep the cursor visible
    const followScroll = () => {
      followCursorRef.current = false;
      scheduleUpdate();
    };

    updateActive();
    editor.on("selectionUpdate", followCursor);
    // A click that leaves the selection unchanged emits no selectionUpdate
    editor.view.dom.addEventListener("mouseup", followCursor);
    container.addEventListener("wheel", followScroll, { passive: true });
    container.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      editor.off("selectionUpdate", followCursor);
      editor.view.dom.removeEventListener("mouseup", followCursor);
      container.removeEventListener("wheel", followScroll);
      container.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [editor, headings, scrollContainerRef]);

  // Fade out as the text column approaches, so the indicator never overlaps the text
  useEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    const textColumn = editor.view.dom;

    const updateOpacity = () => {
      const paddingRight = parseFloat(getComputedStyle(textColumn).paddingRight) || 0;
      const textRight = textColumn.getBoundingClientRect().right - paddingRight;
      const gap = indicator.getBoundingClientRect().left - textRight;
      setOpacity(Math.min(1, Math.max(0, gap / FADE_DISTANCE_PX)));
    };

    updateOpacity();
    const observer = new ResizeObserver(updateOpacity);
    observer.observe(textColumn);
    observer.observe(indicator);
    window.addEventListener("resize", updateOpacity);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateOpacity);
    };
  }, [editor, headings.length, mode]);

  // Outline view: track the available height to know how far the list must scroll
  useEffect(() => {
    const indicator = indicatorRef.current;
    if (mode !== "outline" || !indicator) return;
    const observer = new ResizeObserver(() => setOutlineHeight(indicator.clientHeight));
    observer.observe(indicator);
    return () => observer.disconnect();
  }, [mode, headings.length]);

  if (headings.length === 0) return null;

  if (mode === "outline") {
    const listHeight = headings.length * ROW_HEIGHT_PX - ROW_GAP_PX;
    const overflows = listHeight > outlineHeight;
    // Keep the focused heading centered once the list no longer fits
    const scrollOffset = overflows
      ? Math.min(
          Math.max(0, activeIndex * ROW_HEIGHT_PX - (outlineHeight - ROW_HEIGHT_PX) / 2),
          listHeight - outlineHeight,
        )
      : 0;
    // Fade only the edges that have hidden headings beyond them
    const fadeTop = scrollOffset > 0;
    const fadeBottom = overflows && scrollOffset < listHeight - outlineHeight;
    const edgeFade = `linear-gradient(to bottom, ${fadeTop ? "transparent" : "black"}, black 16px, black calc(100% - 16px), ${fadeBottom ? "transparent" : "black"})`;

    return (
      <div
        ref={indicatorRef}
        aria-hidden
        className="absolute right-4 top-8 bottom-4 pointer-events-none w-16 overflow-hidden transition-opacity duration-150"
        style={{
          opacity,
          maskImage: fadeTop || fadeBottom ? edgeFade : undefined,
          WebkitMaskImage: fadeTop || fadeBottom ? edgeFade : undefined,
        }}
      >
        <div
          className="flex flex-col items-end transition-transform duration-150 ease-out"
          style={{ gap: ROW_GAP_PX, transform: `translateY(${-scrollOffset}px)` }}
        >
          {headings.map((heading, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 shrink-0"
              style={{ height: ROW_HEIGHT_PX - ROW_GAP_PX }}
            >
              <HeadingRow
                level={heading.level}
                label={heading.label}
                isActive={index === activeIndex}
                onSelect={() => jumpToHeading(heading.pos)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // One extra row per side stays mounted (transparent) so rows fade in and out while sliding
  const start = Math.max(0, activeIndex - NEIGHBOR_COUNT - 1);
  const rendered = headings.slice(start, activeIndex + NEIGHBOR_COUNT + 2);

  return (
    <div
      ref={indicatorRef}
      aria-hidden
      className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none w-16 transition-opacity duration-150"
      style={{ opacity, height: (NEIGHBOR_COUNT * 2 + 1) * ROW_HEIGHT_PX }}
    >
      {rendered.map((heading, i) => {
        const index = start + i;
        const offset = index - activeIndex;
        const isActive = offset === 0;
        return (
          <div
            key={index}
            className="absolute right-0 top-0 flex items-center gap-1.5 transition-[transform,opacity] duration-150 ease-out"
            style={{
              height: ROW_HEIGHT_PX - ROW_GAP_PX,
              transform: `translateY(${(offset + NEIGHBOR_COUNT) * ROW_HEIGHT_PX}px)`,
              opacity: Math.abs(offset) > NEIGHBOR_COUNT ? 0 : 1,
            }}
          >
            <HeadingRow
              level={heading.level}
              label={heading.label}
              isActive={isActive}
              onSelect={() => jumpToHeading(heading.pos)}
            />
          </div>
        );
      })}
    </div>
  );
});

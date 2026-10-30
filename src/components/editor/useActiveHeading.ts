import { useEffect, useRef, useState, type RefObject } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";

/** A heading counts as focused once its top passes this fraction of the viewport height. */
const FOCUS_LINE_RATIO = 0.3;

export interface HeadingEntry {
  pos: number;
  level: number;
  text: string;
  /** Hierarchical number such as "1", "1.2" or "1.2.1"; empty for H1. */
  label: string;
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
    headings.push({ pos, level, text: node.textContent, label });
    return false;
  });
  return headings;
}

/** Moves the cursor into the heading at `pos` and scrolls it to the top. */
export function jumpToHeading(editor: TiptapEditor, pos: number) {
  editor.chain().focus().setTextSelection(pos + 1).run();
  const element = editor.view.nodeDOM(pos);
  if (element instanceof HTMLElement) {
    element.scrollIntoView({ block: "start" });
  }
}

/**
 * The document's headings and the index of the one in focus: the cursor's section after clicking or
 * typing, otherwise the section at the scroll position.
 */
export function useActiveHeading(
  editor: TiptapEditor,
  scrollContainerRef: RefObject<HTMLDivElement | null>,
) {
  const [headings, setHeadings] = useState<HeadingEntry[]>(() => collectHeadings(editor));
  const [activeIndex, setActiveIndex] = useState(0);
  // Clicking or typing makes the cursor's section focused; wheel scrolling hands focus back to the viewport
  const followCursorRef = useRef(false);

  // Keep the heading list in sync with the document
  useEffect(() => {
    const handleUpdate = () => setHeadings(collectHeadings(editor));
    handleUpdate();
    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor]);

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

  return { headings, activeIndex };
}

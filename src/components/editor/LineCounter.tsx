import { useEffect, useRef, type RefObject } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

interface LineCounterProps {
  editor: TiptapEditor;
  sourceMode: boolean;
  sourceContent: string;
  sourceTextareaRef: RefObject<HTMLTextAreaElement | null>;
}

// Counts what the line number gutter counts (see the Line numbers rules in App.css). A cursor in an
// unnumbered block, like a table, reports the last line above it.
export function getLinePosition(doc: ProseMirrorNode, pos: number) {
  let line = 0;
  let total = 0;
  doc.descendants((node, nodePos) => {
    const name = node.type.name;
    if (name === "table" || name === "frontmatter") return false;
    if (name === "codeBlock") {
      if (node.attrs.language === "mermaid") return false;
      const text = node.textContent;
      if (nodePos < pos) {
        const before = text.slice(0, pos - nodePos - 1);
        line = total + before.split("\n").length;
      }
      total += text.split("\n").length;
      return false;
    }
    if (name === "paragraph" || name === "heading") {
      total += 1;
      if (nodePos < pos) line = total;
      return false;
    }
    return true;
  });
  return { line: Math.max(line, 1), total: Math.max(total, 1) };
}

// Cursor line out of all lines. Writes the text directly, so moving the cursor causes no React
// renders, and walks the document at most once a frame.
export function LineCounter({
  editor,
  sourceMode,
  sourceContent,
  sourceTextareaRef,
}: LineCounterProps) {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (sourceMode) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const { doc, selection } = editor.state;
      const { line, total } = getLinePosition(doc, selection.head);
      if (textRef.current) textRef.current.textContent = `${line}/${total}`;
    };
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    // Not update/selectionUpdate: loading a note sets content without emitting them
    editor.on("transaction", scheduleUpdate);
    return () => {
      editor.off("transaction", scheduleUpdate);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [editor, sourceMode]);

  useEffect(() => {
    const textarea = sourceTextareaRef.current;
    if (!sourceMode || !textarea) return;

    const update = () => {
      const before = textarea.value.slice(0, textarea.selectionStart);
      const line = before.split("\n").length;
      const total = textarea.value.split("\n").length;
      if (textRef.current) textRef.current.textContent = `${line}/${total}`;
    };

    update();
    const events = ["input", "keyup", "pointerup", "select"];
    events.forEach((event) => textarea.addEventListener(event, update));
    return () => {
      events.forEach((event) => textarea.removeEventListener(event, update));
    };
  }, [sourceMode, sourceContent, sourceTextareaRef]);

  return (
    <span
      ref={textRef}
      title="Current line / total lines"
      className="text-xs text-text-muted tabular-nums mr-2"
    />
  );
}

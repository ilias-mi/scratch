import { forwardRef, memo, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

interface NoteNameBarProps {
  noteId: string;
  visible: boolean;
  // Focuses and selects the name whenever it changes (0 = never)
  focusRequest: number;
  onRename: (name: string) => Promise<void>;
  onDone: () => void;
}

// Filename field revealed above the editor when scrolling up
export const NoteNameBar = memo(
  forwardRef<HTMLDivElement, NoteNameBarProps>(function NoteNameBar(
    { noteId, visible, focusRequest, onRename, onDone },
    ref,
  ) {
    const slash = noteId.lastIndexOf("/");
    const folder = slash > 0 ? noteId.substring(0, slash) : "";
    const name = noteId.substring(slash + 1);
    const [value, setValue] = useState(name);
    const inputRef = useRef<HTMLInputElement>(null);
    const cancelRef = useRef(false);

    useEffect(() => setValue(name), [name]);

    useEffect(() => {
      if (focusRequest) inputRef.current?.select();
    }, [focusRequest]);

    const commit = () => {
      const trimmed = value.trim();
      if (cancelRef.current || !trimmed || trimmed === name) {
        cancelRef.current = false;
        setValue(name);
        return;
      }
      onRename(trimmed).catch((err) => {
        setValue(name);
        toast.error(`Failed to rename: ${err instanceof Error ? err.message : err}`);
      });
    };

    return (
      <div
        ref={ref}
        inert={!visible}
        className={cn(
          "absolute inset-x-0 top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-sm transition-[transform,opacity,visibility] duration-200 ease-out",
          // Hidden fully once it slides out, so its backdrop blur isn't composited while scrolling
          visible ? "visible translate-y-0 opacity-100" : "invisible -translate-y-full opacity-0",
        )}
      >
        <div
          className="mx-auto flex items-center px-6 h-9 text-sm"
          style={{ maxWidth: "var(--editor-max-width, 48rem)" }}
        >
          {folder && (
            <span className="shrink-0 truncate max-w-[40%] text-text-muted">
              {folder.split("/").join(" / ")}&nbsp;/&nbsp;
            </span>
          )}
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                cancelRef.current = e.key === "Escape";
                e.currentTarget.blur();
                onDone();
              }
            }}
            placeholder="Untitled"
            aria-label="Filename"
            spellCheck={false}
            className="flex-1 min-w-0 bg-transparent font-medium text-text outline-none placeholder:text-text-muted"
          />
          <span className="shrink-0 text-text-muted">.md</span>
        </div>
      </div>
    );
  }),
);

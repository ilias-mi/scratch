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
          // Opaque and without a fade, so it slides over the section path instead of ghosting on it
          "absolute inset-x-0 top-0 z-20 border-b border-border bg-bg transition-[transform,visibility] duration-200 ease-out",
          visible ? "visible translate-y-0" : "invisible -translate-y-full",
        )}
      >
        <div className="flex items-center px-4 h-6 text-xs">
          <span className="shrink-0 pr-1.5 text-text-muted">filename:</span>
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

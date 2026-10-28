import { memo, useEffect, useMemo, useRef } from "react";
import { useNotesActions, useNotesData } from "../../context/NotesContext";
import { cn } from "../../lib/utils";
import { XIcon } from "../icons";

// Open notes of this window; hidden while only one note is open
export const TabBar = memo(function TabBar() {
  const { tabs, selectedNoteId, notes } = useNotesData();
  const { selectNote, closeTab } = useNotesActions();
  const activeRef = useRef<HTMLDivElement>(null);

  const titles = useMemo(
    () => new Map(notes.map((note) => [note.id, note.title])),
    [notes],
  );

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedNoteId]);

  if (tabs.length < 2) return null;

  return (
    <div role="tablist" className="flex items-center gap-0.5 min-w-0 overflow-x-auto scrollbar-none">
      {tabs.map((id) => {
        const active = id === selectedNoteId;
        return (
          <div
            key={id}
            ref={active ? activeRef : undefined}
            role="tab"
            aria-selected={active}
            title={id}
            onClick={() => {
              if (!active) selectNote(id);
            }}
            onAuxClick={(e) => {
              if (e.button === 1) closeTab(id);
            }}
            className={cn(
              "group/tab h-7 shrink-0 max-w-44 flex items-center gap-1 pl-2.5 pr-1 rounded-md text-xs cursor-default select-none transition-colors",
              active
                ? "bg-bg-emphasis text-text font-medium"
                : "text-text-muted hover:bg-bg-muted hover:text-text",
            )}
          >
            <span className="truncate">
              {titles.get(id) ?? id.substring(id.lastIndexOf("/") + 1)}
            </span>
            <button
              type="button"
              aria-label="Close tab"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(id);
              }}
              className={cn(
                "shrink-0 rounded p-0.5 hover:bg-bg-muted",
                active ? "opacity-60 hover:opacity-100" : "opacity-0 in-tab-hover:opacity-60 hover:opacity-100",
              )}
            >
              <XIcon className="w-3 h-3 stroke-2" />
            </button>
          </div>
        );
      })}
    </div>
  );
});

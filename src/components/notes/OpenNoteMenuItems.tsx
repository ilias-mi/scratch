import * as ContextMenu from "@radix-ui/react-context-menu";
import { toast } from "sonner";
import { useNotesActions } from "../../context/NotesContext";
import { openNoteWindow } from "../../services/notes";
import { ExternalLinkIcon, PlusIcon } from "../icons";

// "Open in New Tab / Window" entries shared by the note list and folder tree menus
export function OpenNoteMenuItems({ id, itemClassName }: { id: string; itemClassName: string }) {
  const { openNoteInNewTab } = useNotesActions();
  return (
    <>
      <ContextMenu.Item className={itemClassName} onSelect={() => openNoteInNewTab(id)}>
        <PlusIcon className="w-4 h-4 stroke-[1.6]" />
        Open in New Tab
      </ContextMenu.Item>
      <ContextMenu.Item
        className={itemClassName}
        onSelect={() =>
          openNoteWindow(id).catch(() => toast.error("Failed to open window"))
        }
      >
        <ExternalLinkIcon className="w-4 h-4 stroke-[1.6]" />
        Open in New Window
      </ContextMenu.Item>
    </>
  );
}

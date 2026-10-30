import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useNotesActions } from "../../context/NotesContext";
import { FolderNameDialog } from "./FolderNameDialog";

const RENAME_NOTE_EVENT = "rename-note";

// Opens the rename dialog for a note from any list's context menu
export function requestRenameNote(id: string) {
  window.dispatchEvent(new CustomEvent(RENAME_NOTE_EVENT, { detail: id }));
}

export function RenameNoteDialog() {
  const { renameNote } = useNotesActions();
  const [noteId, setNoteId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => setNoteId((e as CustomEvent<string>).detail);
    window.addEventListener(RENAME_NOTE_EVENT, handler);
    return () => window.removeEventListener(RENAME_NOTE_EVENT, handler);
  }, []);

  const handleConfirm = useCallback(
    async (name: string) => {
      if (!noteId) return;
      setNoteId(null);
      try {
        await renameNote(noteId, name);
      } catch (err) {
        toast.error(`Failed to rename: ${err instanceof Error ? err.message : err}`);
      }
    },
    [noteId, renameNote],
  );

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) setNoteId(null);
  }, []);

  return (
    <FolderNameDialog
      open={noteId !== null}
      onOpenChange={handleOpenChange}
      onConfirm={handleConfirm}
      title="Rename Note"
      description="Enter a new filename for the note"
      confirmLabel="Rename"
      placeholder="Note name"
      defaultValue={noteId?.substring(noteId.lastIndexOf("/") + 1) ?? ""}
    />
  );
}

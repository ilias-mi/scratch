// Notes opened from outside the notes folder (Finder, the CLI, drag and drop) use their absolute
// path as ID; notes inside it use a path relative to the folder, without extension
export function isExternalNoteId(id: string): boolean {
  return /^(\/|[A-Za-z]:[\\/]|\\\\)/.test(id);
}

// A note's file name split into the editable name and the extension shown after it
export function noteFileName(id: string): { name: string; ext: string } {
  const leaf = id.substring(Math.max(id.lastIndexOf("/"), id.lastIndexOf("\\")) + 1);
  if (!isExternalNoteId(id)) return { name: leaf, ext: ".md" };
  const dot = leaf.lastIndexOf(".");
  return dot > 0
    ? { name: leaf.substring(0, dot), ext: leaf.substring(dot) }
    : { name: leaf, ext: "" };
}

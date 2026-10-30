// Remembers where each note was left (scroll offset and selection) so
// switching back lands in the same place. Entries expire 12h after their last update.

export interface NotePosition {
  scrollTop: number;
  from: number;
  to: number;
}

interface StoredPosition extends NotePosition {
  updatedAt: number;
}

const STORAGE_KEY = "scratch:note-positions";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

let positions: Map<string, StoredPosition> | null = null;

function isFresh(position: StoredPosition): boolean {
  return Date.now() - position.updatedAt < MAX_AGE_MS;
}

function load(): Map<string, StoredPosition> {
  if (positions) return positions;
  positions = new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Record<string, StoredPosition>;
      for (const [id, position] of Object.entries(stored)) {
        if (isFresh(position)) positions.set(id, position);
      }
    }
  } catch {
    // Unavailable or corrupt storage: start empty
  }
  return positions;
}

function persist(map: Map<string, StoredPosition>) {
  for (const [id, position] of map) {
    if (!isFresh(position)) map.delete(id);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(map)));
  } catch {
    // Positions are a convenience; keep them in memory only
  }
}

export function getNotePosition(id: string): NotePosition | null {
  const position = load().get(id);
  return position && isFresh(position) ? position : null;
}

export function setNotePosition(id: string, position: NotePosition) {
  const map = load();
  map.set(id, { ...position, updatedAt: Date.now() });
  persist(map);
}

export function renameNotePosition(oldId: string, newId: string) {
  const map = load();
  const position = map.get(oldId);
  if (!position) return;
  map.delete(oldId);
  map.set(newId, position);
  persist(map);
}

# Scratch - Development Guide

## Project Overview

Scratch is a cross-platform markdown note-taking app for macOS, Windows, and Linux, built with Tauri v2 (Rust backend) + React/TypeScript/Tailwind (frontend) + TipTap (WYSIWYG editor) + Tantivy (full-text search).

## Commands

```bash
npm run dev          # Start Vite dev server only
npm run build        # Build frontend (tsc + vite)
npm run tauri dev    # Run full app in development mode
npm run tauri build  # Build production app
```

## CI

Runs on every push to `main` and on PRs. Validates frontend build (`tsc` + Vite) and Rust compilation (`cargo check` + `cargo clippy`) on an Ubuntu runner.

## Key Patterns

- All backend operations go through Tauri commands in `src-tauri/src/lib.rs`. Frontend calls them via `invoke()` from `@tauri-apps/api/core`.
- `NotesContext` uses a dual context pattern (data/actions separated) for performance.
- Settings live in two places: app config at `{APP_DATA}/config.json`, per-folder settings at `{NOTES_FOLDER}/.scratch/settings.json`.
- Tauri v2 permissions go in `src-tauri/capabilities/default.json`.
- The search index buffers edits and commits only before a search (`SearchIndex::commit_pending`, `ReloadPolicy::Manual`). Don't commit per write: it runs on every autosave. The index is rebuilt on startup, so uncommitted edits are never lost.
- A note's title is its filename (`note_title` in `lib.rs`); content never renames a file. `save_note` writes in place and `rename_note` is the only rename. `NotesContext` runs saves and renames through one write queue so a rename never races a save to the old path.
- Tabs are per window, in `NotesContext` (`tabs`). The selected note always has a tab: selecting a note that isn't open replaces the active tab, so opening a new tab is explicit (`openNoteInNewTab`, `createNote(true)`). There is one `Editor`; switching tabs is a note switch that restores the saved position. Windows are full app instances (`main` and `note-*`, created by `open_note_window`), sharing backend state; renames are broadcast to other windows via the `note-renamed` event.
- The section path (`SectionPath`) is a row above the scroll container, not an overlay; `NoteNameBar` slides over it from a wrapper in `Editor.tsx` that clips its top edge (`clip-path`, not `overflow-hidden`, so the headings dropdown can still open downward). `useActiveHeading` holds the heading list and the focused heading (cursor after clicks/typing, scroll position otherwise). Its reading progress line writes `transform` directly from a scroll listener, so scrolling causes no React renders.
- Line numbers (`lineNumbers`: off, faint, subtle) are a CSS counter (`line`) rather than a ProseMirror plugin, so typing runs no JS for them: paragraphs and headings number themselves with `::before`, and `CodeBlockView` adds one span per code line. Each text block counts as one line however it wraps; tables, images, and diagrams aren't numbered, so the numbers won't match source mode, which numbers real markdown lines (`SourceLineNumbers`). `getLinePosition` in `LineCounter` repeats these rules in JS for the `x/max` counter in the top bar, so change them together.
- Table column widths are saved in the note as a `<!-- table-widths: 120,240 -->` comment directly above a resized table, since markdown tables can't hold them (`TableWidths.ts`). Tables without the comment size to their content; the first drag pins every column so the others stay put.
- The file watcher emits every event; the frontend coalesces them with a trailing debounce, so the final write is never dropped.
- Keep style invalidation narrow, since a full restyle of a long note costs 100ms+ in WebKit: use `stack-y-*` instead of `space-y-*`, and the `in-group-*` / `in-tab-hover` / `in-note-list-focus` variants instead of Tailwind's `group-*` (both defined in `App.css`). Tiptap's injected CSS is off (`injectCSS: false`); its base rules live in `App.css` without the `.ProseMirror-hideselection *` rules. `vite.config.ts` drops the typography plugin's `:first-child`/`:last-child` rules (use `margin-trim`), and don't toggle inherited properties (custom properties, `pointer-events`) on ancestors of the note or the note list. That includes drags: `EditorWidthHandles` writes `max-width` to the note and only updates `--editor-max-width` on release.

## Coding Conventions

- Clean, minimal code with low technical debt
- Proper React patterns (contexts, hooks, memoization)
- Type-safe with TypeScript throughout
- No commented-out code or TODOs in production code
- Use `React.memo` for expensive list-item components
- Use `useCallback`/`useMemo` for performance-critical paths
- Debounce user-triggered operations (auto-save 500ms, 300ms in source mode, search 150ms, file watcher 500ms, git status 1000ms)
- All operations should be non-blocking (async)
- Error handling with user-friendly messages

## Releasing

1. Bump version in `package.json` and `src-tauri/tauri.conf.json`
2. Commit to `main`, then tag and push: `git tag v0.5.0 && git push origin v0.5.0`
3. The release workflow builds all platforms and creates a draft GitHub release
4. Update the description in `latest.json` from GitHub after the action finishes
5. Review, edit notes, and publish

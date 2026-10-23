# Scratch

> [!NOTE]
> This is a fork of [erictli/scratch](https://github.com/erictli/scratch) that contains vibe-coded changes to the original project. They were built with AI assistance and are not part of the upstream app.
>
> **Changes in this fork:**
>
> - **Alphabetical notes in folders** - Notes inside folders are sorted A–Z (pinned notes stay on top; root-level notes keep newest-first order)
> - **Sidebar hover reveal** - When the sidebar is hidden, resting the pointer near the left edge of the note editor reveals it, just like the toggle button would. It hides again once the pointer moves away, with a short dwell time so quick movements out of the window don't trigger it
> - **Heading indicator** - A heading indicator on the right edge of the editor shows each heading as a line (longer for higher-ranked levels) and its level number, with the current heading highlighted. It follows the cursor after clicks or typing and the scroll position when scrolling, and fades out before it would overlap the text. Two views, selectable in Settings → Appearance:
>   - **Focused** - Vertically centered, the current heading and its 3 neighbors on each side
>   - **Full Outline** - Top-aligned, all headings, auto-scrolling when they don't fit
> - **Callouts** - Turn a passage into a colored callout from the toolbar or the `/` menu: Note, Info, Tip, Important, Definition, Example, Question, Summary, Exam, Warning, and Caution. Saved as GitHub-style `> [!NOTE]` blockquotes, so they render as alerts on GitHub and as plain quotes elsewhere
> - **Highlights** - Highlight text in yellow, green, blue, pink, or gray from the toolbar (`Cmd+Shift+H` for yellow). Yellow is saved as `==text==`, other colors as `<mark data-color="...">`
> - **Live reload of external edits** - When the open note changes on disk (e.g. edited by another app or an AI agent), it reloads automatically, keeping the cursor position. If you have unsaved edits, the Refresh button appears instead
> - **Lower energy use** - The search index no longer writes to disk on every autosave or polls in the background, refreshing the note list only re-reads changed files, and typing no longer re-renders the whole editor

<img src="docs/app-icon.png" alt="Scratch" width="128" height="128" style="border-radius: 22px; margin-bottom: 8px;">

A minimalist, offline-first markdown note-taking app for macOS, Windows, and Linux.

![macOS](https://img.shields.io/badge/platform-macOS-lightgrey) ![Windows](https://img.shields.io/badge/platform-Windows-blue) ![Linux](https://img.shields.io/badge/platform-Linux-orange)

[Website](https://www.ericli.io/scratch) · [Releases](https://github.com/erictli/scratch/releases)

## Features

- **Offline-first** - No cloud, no account, no internet required
- **Markdown-based** - Notes stored as plain `.md` files you own
- **WYSIWYG editing** - Rich text editing that saves as markdown
- **Preview mode** - Open any `.md` file via drag-and-drop or "Open With" without a notes folder
- **Markdown source mode** - Toggle to view and edit raw markdown (`Cmd+Shift+M`)
- **Syntax highlighting** - 20 languages with GitHub-inspired color scheme
- **Mermaid diagrams** - Render flowcharts, sequence diagrams, and more in fenced code blocks
- **KaTeX math** - Render block `$$...$$` math equations
- **Wikilinks** - Type `[[` to link between notes with autocomplete
- **Slash commands** - Type `/` to quickly insert headings, lists, code blocks, diagrams, and more
- **Focus mode** - Distraction-free writing with animated sidebar/toolbar fade (`Cmd+Shift+Enter`)
- **Edit with Claude Code, OpenAI Codex, OpenCode, or Ollama** - Use your local CLI to edit notes with AI (including fully offline via Ollama)
- **Works with other AI agents** - Picks up external file changes automatically
- **Folders** - Opt-in collapsible folder tree with drag-and-drop to organize notes
- **Keyboard optimized** - Lots of shortcuts and a command palette
- **Customizable** - Theme, typography, page width, and RTL text direction
- **Git integration** - Optional version control with push/pull for multi-device sync
- **Lightweight** - 5-10x smaller than Obsidian or Notion

## Screenshot

![Screenshot](docs/screenshot.png)

## Installation

### macOS

**Homebrew (Recommended)**

```bash
brew tap erictli/tap
brew install --cask erictli/tap/scratch
```

**Manual Download**

1. Download the latest `.dmg` from [Releases](https://github.com/erictli/scratch/releases)
2. Open the DMG and drag Scratch to Applications
3. Open Scratch from Applications

### Windows

Download the latest `.exe` installer from [Releases](https://github.com/erictli/scratch/releases) and run it. WebView2 will be downloaded automatically if needed.

### Linux

Download the latest `.AppImage` or `.deb` from [Releases](https://github.com/erictli/scratch/releases).

### From Source

**Prerequisites:** Node.js 18+, Rust 1.70+

**macOS:** Xcode Command Line Tools · **Windows:** WebView2 Runtime (pre-installed on Windows 11)

```bash
git clone https://github.com/erictli/scratch.git
cd scratch
npm install
npm run tauri dev      # Development
npm run tauri build    # Production build
```

## Keyboard Shortcuts

Scratch is designed to be usable without a mouse. Here are the essentials to get started:

| Shortcut          | Action                 |
| ----------------- | ---------------------- |
| `Cmd+N`           | New note               |
| `Cmd+D`           | Duplicate note         |
| `Delete`          | Delete note            |
| `Cmd+Backspace`   | Delete note            |
| `Cmd+P`           | Command palette        |
| `Cmd+K`           | Add/edit link          |
| `Cmd+F`           | Find in note           |
| `Cmd+Shift+C`     | Copy & Export menu     |
| `Cmd+Shift+M`     | Toggle Markdown source |
| `Cmd+Shift+Enter` | Toggle Focus mode      |
| `Cmd+Shift+F`     | Search notes           |
| `Cmd+R`           | Reload current note    |
| `Cmd+,`           | Open settings          |
| `Cmd+\`           | Toggle sidebar         |
| `Cmd+B/I`         | Bold/Italic            |
| `Cmd+Shift+H`     | Highlight              |
| `Cmd+=/-/0`       | Zoom in/out/reset      |
| `↑/↓`             | Navigate notes         |

**Note:** On Windows, use `Ctrl` instead of `Cmd` for all shortcuts.

Many more shortcuts and features are available in the app—explore via the command palette (`Cmd+P` / `Ctrl+P`) or view the full reference in Settings → Shortcuts.

## Built With

[Tauri](https://tauri.app/) · [React](https://react.dev/) · [TipTap](https://tiptap.dev/) · [Tailwind CSS](https://tailwindcss.com/) · [Tantivy](https://github.com/quickwit-oss/tantivy)

## Contributing

Scratch is mostly stable and intentionally minimal, so I'm no longer monitoring issues and PRs regularly. You're welcome to open them, but I can't guarantee I'll get to everything, and it may take a while when I do.

What makes Scratch special is its minimal feature set and focus on user experience. We're not trying to build Obsidian or Notion, so not every feature will be a fit. If you want to make major changes or take Scratch in a new direction, you should fork it – it's MIT licensed.

**If you open a PR:** keep it small and focused, and try to address any CodeRabbit comments. I generally won't go back and forth with review comments – if I merge, I'll make any additional changes directly.

## License

MIT

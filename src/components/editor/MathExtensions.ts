import { InputRule } from "@tiptap/core";
import {
  BlockMath,
  InlineMath,
  type InlineMathOptions,
} from "@tiptap/extension-mathematics";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, NodeSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import katex, { type KatexOptions } from "katex";

export function normalizeBlockMath(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^\$\$([\s\S]*?)\$\$$/);
  return (match?.[1] ?? trimmed).trim();
}

export const ScratchBlockMath = BlockMath.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^\$\$([^$]+)\$\$$/,
        handler: ({ state, range, match }) => {
          const latex = (match[1] ?? "").trim();
          if (!latex) return;

          state.tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ latex }),
          );
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    const onClick = this.options.onClick;
    return [
      new Plugin({
        key: new PluginKey("blockMathSelection"),
        view() {
          return {
            // Clear native DOM selection when a blockMath node is selected.
            // ProseMirror's NodeSelection sets a DOM selection that spans all
            // content before the atom node, causing a visible highlight bleed.
            update(view) {
              const { selection } = view.state;
              if (
                selection instanceof NodeSelection &&
                selection.node.type.name === "blockMath"
              ) {
                window.getSelection()?.removeAllRanges();
              }
            },
          };
        },
        props: {
          // Open editor on Enter or Space when a blockMath node is selected
          handleKeyDown(view, event) {
            if (event.key !== "Enter" && event.key !== " ") return false;
            const { selection } = view.state;
            if (
              selection instanceof NodeSelection &&
              selection.node.type.name === "blockMath" &&
              onClick
            ) {
              event.preventDefault();
              onClick(selection.node, selection.from);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

// Pandoc-style inline math: the opening $ is followed by a non-space, the
// closing $ is preceded by a non-space and not followed by a digit or $,
// so prices like "$5 and $10" stay plain text. Backticks are excluded so math
// never spans into inline code
const INLINE_MATH_TOKEN = new RegExp(
  String.raw`^\$((?:\\.|[^\s$\\\`])(?:(?:\\.|[^\\$\`\n])*?(?:\\.|[^\s$\\\`]))?)\$(?![\d$])`,
);

// Live rendering of the formula being edited in the math popup, drawn as a
// widget so it changes neither the document nor the undo history
export interface MathPreview {
  pos: number;
  latex: string;
  // Hide the inline math node at pos while its replacement is previewed
  replacing?: boolean;
}

interface MathPreviewState {
  preview: MathPreview | null;
  decorations: DecorationSet;
}

const mathPreviewKey = new PluginKey<MathPreviewState>("mathPreview");

export function setMathPreview(view: EditorView, preview: MathPreview | null) {
  if (!preview && !mathPreviewKey.getState(view.state)?.preview) return;
  view.dispatch(view.state.tr.setMeta(mathPreviewKey, preview));
}

function buildPreviewDecorations(
  doc: PMNode,
  preview: MathPreview | null,
  katexOptions: KatexOptions | undefined,
): DecorationSet {
  if (!preview) return DecorationSet.empty;

  const widget = Decoration.widget(
    preview.pos,
    () => {
      const span = document.createElement("span");
      span.className = "tiptap-mathematics-render math-preview";
      if (!preview.latex) {
        span.classList.add("math-preview--empty");
        span.textContent = "$";
        return span;
      }
      try {
        katex.render(preview.latex, span, katexOptions);
      } catch {
        span.textContent = preview.latex;
        span.classList.add("inline-math-error");
      }
      return span;
    },
    { key: `math-preview:${preview.latex}`, side: -1 },
  );

  const decorations = [widget];
  const node = preview.replacing ? doc.nodeAt(preview.pos) : null;
  if (node) {
    decorations.push(
      Decoration.node(preview.pos, preview.pos + node.nodeSize, {
        class: "math-preview-replaced",
      }),
    );
  }
  return DecorationSet.create(doc, decorations);
}

export interface ScratchInlineMathOptions extends InlineMathOptions {
  // Called instead of inserting a typed "$" outside of code
  onDollar?: () => void;
}

export const ScratchInlineMath = InlineMath.extend<ScratchInlineMathOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      onDollar: undefined,
    };
  },

  markdownTokenizer: {
    name: "inlineMath",
    level: "inline" as const,
    start: (src: string) => src.indexOf("$"),
    tokenize: (src: string) => {
      const match = src.match(INLINE_MATH_TOKEN);
      if (!match) return undefined;
      return { type: "inlineMath", raw: match[0], latex: match[1] };
    },
  },

  // Typing "$" opens the math popup instead, so the built-in $$x$$ rule is dropped
  addInputRules() {
    return [];
  },

  addProseMirrorPlugins() {
    const { katexOptions, onDollar } = this.options;
    return [
      new Plugin<MathPreviewState>({
        key: mathPreviewKey,
        state: {
          init: () => ({ preview: null, decorations: DecorationSet.empty }),
          apply(tr, value) {
            const meta = tr.getMeta(mathPreviewKey) as
              MathPreview | null | undefined;
            if (meta !== undefined) {
              return {
                preview: meta,
                decorations: buildPreviewDecorations(
                  tr.doc,
                  meta,
                  katexOptions,
                ),
              };
            }
            if (!tr.docChanged || !value.preview) return value;
            return {
              preview: {
                ...value.preview,
                pos: tr.mapping.map(value.preview.pos),
              },
              decorations: value.decorations.map(tr.mapping, tr.doc),
            };
          },
        },
        props: {
          decorations(state) {
            return mathPreviewKey.getState(state)?.decorations;
          },
          handleTextInput(view, from, _to, text) {
            if (text !== "$" || !onDollar) return false;
            const $from = view.state.doc.resolve(from);
            if ($from.parent.type.spec.code) return false;
            const marks = view.state.storedMarks ?? $from.marks();
            if (marks.some((mark) => mark.type.spec.code)) return false;
            onDollar();
            return true;
          },
        },
      }),
    ];
  },
});

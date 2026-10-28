import { InputRule } from "@tiptap/core";
import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";
import { Plugin, PluginKey, NodeSelection } from "@tiptap/pm/state";

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
const INLINE_MATH_BODY = String.raw`((?:\\.|[^\s$\\\`])(?:(?:\\.|[^\\$\`\n])*?(?:\\.|[^\s$\\\`]))?)`;
const INLINE_MATH_TOKEN = new RegExp(String.raw`^\$${INLINE_MATH_BODY}\$(?![\d$])`);
const INLINE_MATH_INPUT = new RegExp(String.raw`(?:^|[^$\\])(\$${INLINE_MATH_BODY}\$)$`);

export const ScratchInlineMath = InlineMath.extend({
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

  // Typing the closing $ of $x$ renders it
  addInputRules() {
    return [
      new InputRule({
        find: INLINE_MATH_INPUT,
        handler: ({ state, range, match }) => {
          const from = range.to - match[1].length;
          state.tr.replaceWith(
            from,
            range.to,
            this.type.create({ latex: match[2] }),
          );
        },
      }),
    ];
  },
});

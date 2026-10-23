import {
  Mark,
  mergeAttributes,
  type JSONContent,
  type MarkdownToken,
} from "@tiptap/core";

export const HIGHLIGHT_COLORS = {
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  pink: "Pink",
  gray: "Gray",
} as const;

export type HighlightColor = keyof typeof HIGHLIGHT_COLORS;

export const HIGHLIGHT_COLOR_NAMES = Object.keys(
  HIGHLIGHT_COLORS,
) as HighlightColor[];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    highlight: {
      setHighlight: (color?: HighlightColor) => ReturnType;
      toggleHighlight: (color?: HighlightColor) => ReturnType;
      unsetHighlight: () => ReturnType;
    };
  }
}

// Yellow is written as ==text==; other colours need a color attribute,
// so they are written as <mark data-color="...">text</mark>
export const Highlight = Mark.create({
  name: "highlight",

  addAttributes() {
    return {
      color: {
        default: "yellow",
        parseHTML: (element) => element.getAttribute("data-color") ?? "yellow",
        renderHTML: (attributes) => ({ "data-color": attributes.color }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "mark" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setHighlight:
        (color = "yellow") =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      toggleHighlight:
        (color = "yellow") =>
        ({ commands }) =>
          commands.toggleMark(this.name, { color }),
      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-h": () => this.editor.commands.toggleHighlight(),
    };
  },

  markdownTokenName: "highlight",

  markdownTokenizer: {
    name: "highlight",
    level: "inline" as const,
    start: (src: string) => src.search(/==|<mark/),
    tokenize(src: string, _tokens: MarkdownToken[], helper) {
      const match = src.match(
        /^(?:==([^=\n]+?)==|<mark data-color="(green|blue|pink|gray)">([\s\S]+?)<\/mark>)/,
      );
      if (!match) return undefined;
      const [raw, yellowText, color, colorText] = match;
      return {
        type: "highlight",
        raw,
        color: color ?? "yellow",
        tokens: helper.inlineTokens(yellowText ?? colorText),
      };
    },
  },

  parseMarkdown(token: MarkdownToken & { color?: string }, helpers) {
    return helpers.applyMark(
      "highlight",
      helpers.parseInline(token.tokens || []),
      { color: token.color ?? "yellow" },
    );
  },

  renderMarkdown(node: JSONContent, helpers) {
    const color = node.attrs?.color ?? "yellow";
    const text = helpers.renderChildren(node);
    if (color === "yellow") return `==${text}==`;
    return `<mark data-color="${color}">${text}</mark>`;
  },
});

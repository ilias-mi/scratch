import {
  Node,
  findParentNode,
  mergeAttributes,
  type JSONContent,
  type MarkdownToken,
} from "@tiptap/core";

export const CALLOUT_LABELS = {
  note: "Note",
  info: "Info",
  tip: "Tip",
  important: "Important",
  definition: "Definition",
  example: "Example",
  question: "Question",
  summary: "Summary",
  exam: "Exam",
  warning: "Warning",
  caution: "Caution",
} as const;

export type CalloutType = keyof typeof CALLOUT_LABELS;

export const CALLOUT_TYPES = Object.keys(CALLOUT_LABELS) as CalloutType[];

function isCalloutType(value: string): value is CalloutType {
  return value in CALLOUT_LABELS;
}

// Matches a GitHub-style alert: "> [!TYPE] optional text" followed by quoted lines
const CALLOUT_PATTERN = /^> \[!([A-Za-z]+)\][^\n]*(?:\n>[^\n]*)*/;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (type: CalloutType) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (element) => element.getAttribute("data-callout"),
        renderHTML: (attributes) => ({ "data-callout": attributes.type }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes["data-callout"] as CalloutType;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "callout",
        "data-label": CALLOUT_LABELS[type] ?? CALLOUT_LABELS.note,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (type) =>
        ({ state, commands }) => {
          const isInCallout = findParentNode(
            (node) => node.type.name === this.name,
          )(state.selection);
          if (isInCallout) {
            return commands.updateAttributes(this.name, { type });
          }
          return commands.wrapIn(this.name, { type });
        },
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },

  markdownTokenName: "callout",

  markdownTokenizer: {
    name: "callout",
    level: "block" as const,
    start: "> [!",
    tokenize(src: string, _tokens: MarkdownToken[], helper) {
      const match = src.match(CALLOUT_PATTERN);
      if (!match) return undefined;

      const type = match[1].toLowerCase();
      if (!isCalloutType(type)) return undefined;

      const [marker, ...quotedLines] = match[0].split("\n");
      const markerText = marker.replace(/^> \[![A-Za-z]+\]/, "").trim();
      const bodyLines = [
        ...(markerText ? [markerText] : []),
        ...quotedLines.map((line) => line.replace(/^> ?/, "")),
      ];

      return {
        type: "callout",
        raw: match[0],
        calloutType: type,
        tokens: helper.blockTokens(bodyLines.join("\n")),
      };
    },
  },

  parseMarkdown(token: MarkdownToken & { calloutType?: string }, helpers) {
    const children = helpers.parseChildren(token.tokens ?? []);
    return helpers.createNode(
      "callout",
      { type: token.calloutType },
      children.length > 0 ? children : [{ type: "paragraph" }],
    );
  },

  renderMarkdown(node: JSONContent, helpers) {
    const body = helpers
      .renderChildren(node.content ?? [], "\n\n")
      .replace(/\n+$/, "")
      .split("\n")
      .map((line: string) => (line ? `> ${line}` : ">"));
    const type = String(node.attrs?.type ?? "note").toUpperCase();
    return [`> [!${type}]`, ...body].join("\n");
  },
});

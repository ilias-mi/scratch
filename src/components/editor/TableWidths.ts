import { Extension, type JSONContent } from "@tiptap/core";
import {
  Table,
  TableView,
  renderTableToMarkdown,
} from "@tiptap/extension-table";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, type EditorState } from "@tiptap/pm/state";
import { columnResizingPluginKey } from "@tiptap/pm/tables";
import type { EditorView } from "@tiptap/pm/view";

// Markdown tables can't hold column widths, so a resized table is saved with a comment directly
// above it, which every markdown renderer hides: <!-- table-widths: 120,240 -->
const WIDTHS_MARKER = "<!-- table-widths:";
const WIDTHS_PATTERN =
  /^<!-- table-widths: (\d+(?:,\d+)*) -->\n+((?:[^\n]*\|[^\n]*(?:\n|$))+)/;

interface MarkdownCell {
  text: string;
  tokens: unknown[];
}

function getColumnWidths(table: ProseMirrorNode): number[] | null {
  const widths: number[] = [];
  table.firstChild?.forEach((cell) => {
    const width = cell.attrs.colwidth?.[0];
    if (width) widths.push(width);
  });
  return widths.length > 0 && widths.length === table.firstChild?.childCount
    ? widths
    : null;
}

// Tables without widths keep sizing to their content, as they do when not resizable
class ResizedTableView extends TableView {
  constructor(node: ProseMirrorNode, cellMinWidth: number) {
    super(node, cellMinWidth);
    this.table.classList.toggle("fixed-columns", !!getColumnWidths(node));
  }

  update(node: ProseMirrorNode) {
    const updated = super.update(node);
    if (updated) {
      this.table.classList.toggle("fixed-columns", !!getColumnWidths(node));
    }
    return updated;
  }
}

export const ResizableTable = Table.extend({
  renderMarkdown(node, h) {
    const markdown = renderTableToMarkdown(node, h);
    const widths = node.content?.[0]?.content?.map(
      (cell) => cell.attrs?.colwidth?.[0],
    );
    return widths?.every(Boolean)
      ? `${WIDTHS_MARKER} ${widths.join(",")} -->\n${markdown.trimStart()}`
      : markdown;
  },
}).configure({
  resizable: true,
  cellMinWidth: 60,
  handleWidth: 8,
  View: ResizedTableView,
  HTMLAttributes: { class: "not-prose" },
});

// Pins every column at its current width as a drag starts, so resizing one leaves the others alone
function pinColumnWidths(view: EditorView, state: EditorState, cellPos: number) {
  const $cell = state.doc.resolve(cellPos);
  const tableDepth = $cell.depth - 1;
  const table = $cell.node(tableDepth);
  if (getColumnWidths(table)) return;

  const tablePos = $cell.before(tableDepth);
  const dom = view.nodeDOM(tablePos) as HTMLElement | null;
  const firstRow = dom?.querySelector("tr");
  if (!firstRow) return;
  const widths = Array.from(
    firstRow.children,
    (cell) => (cell as HTMLElement).offsetWidth,
  );

  const tr = state.tr;
  table.forEach((row, rowOffset) => {
    row.forEach((_cell, cellOffset, column) => {
      const pos = tablePos + 1 + rowOffset + 1 + cellOffset;
      tr.setNodeAttribute(pos, "colwidth", [widths[column]]);
    });
  });
  view.dispatch(tr.setMeta("addToHistory", false));
}

export const TableWidths = Extension.create({
  name: "tableWidths",
  // Ahead of the table extension, so its resize plugin sees the pinned widths
  priority: 101,

  markdownTokenName: "tableWidths",

  markdownTokenizer: {
    name: "tableWidths",
    level: "block",
    start: WIDTHS_MARKER,
    tokenize(src, _tokens, lexer) {
      const match = WIDTHS_PATTERN.exec(src);
      if (!match) return undefined;
      const [table] = lexer.blockTokens(match[2]);
      if (table?.type !== "table") return undefined;

      // This lexer never runs its inline queue, which would otherwise fill in the cells
      const cells: MarkdownCell[] = [table.header, ...table.rows].flat();
      for (const cell of cells) cell.tokens = lexer.inlineTokens(cell.text);

      return {
        type: "tableWidths",
        raw: match[0],
        widths: match[1].split(",").map(Number),
        table,
      };
    },
  },

  parseMarkdown(token, h) {
    const [table] = h.parseChildren([token.table]) as JSONContent[];
    for (const row of table.content ?? []) {
      row.content?.forEach((cell, column) => {
        const width = token.widths[column];
        cell.attrs = { ...cell.attrs, colwidth: width ? [width] : null };
      });
    }
    return table;
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mousedown(view) {
              const handle = columnResizingPluginKey.getState(
                view.state,
              )?.activeHandle;
              if (handle !== undefined && handle > -1) {
                pinColumnWidths(view, view.state, handle);
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});

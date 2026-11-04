import { OrderedList, TaskList } from "@tiptap/extension-list";
import type { MarkdownTokenizer } from "@tiptap/core";

// TipTap's ordered and task list tokenizers split the whole rest of the note into lines before
// checking whether a list starts at all. The markdown lexer tries them at every block, so parsing
// a note took time quadratic in its length. An anchored test of the first line rejects all other
// blocks first; each pattern is a necessary condition of the tokenizer it guards, so what parses
// as a list is unchanged.
function guardTokenizer(tokenizer: MarkdownTokenizer, start: RegExp): MarkdownTokenizer {
  return {
    ...tokenizer,
    tokenize(src, tokens, lexer) {
      return start.test(src) ? tokenizer.tokenize(src, tokens, lexer) : undefined;
    },
  };
}

// "1. item" on the first line (ORDERED_LIST_ITEM_REGEX in @tiptap/extension-list)
const ORDERED_ITEM_START = /^[^\S\n]*\d+\.[^\S\n]/;
// "- [ ] item" on the first non-blank line (the task item pattern in @tiptap/extension-list)
const TASK_ITEM_START = /^(?:[^\S\n]*\n)*[^\S\n]*[-+*][^\S\n]+\[[ xX]\][^\S\n]/;

export const FastOrderedList = OrderedList.extend({
  markdownTokenizer: guardTokenizer(OrderedList.config.markdownTokenizer!, ORDERED_ITEM_START),
});

export const FastTaskList = TaskList.extend({
  markdownTokenizer: guardTokenizer(TaskList.config.markdownTokenizer!, TASK_ITEM_START),
});

"use client";

import type { BlockNoteEditor } from "@blocknote/core";

type DefaultPasteHandler = (context?: {
  prioritizeMarkdownOverHTML?: boolean;
  plainTextAsMarkdown?: boolean;
}) => boolean | undefined;

type SafePasteContext = {
  event: ClipboardEvent;
  editor: BlockNoteEditor;
  defaultPasteHandler: DefaultPasteHandler;
};

function extractPlainTextFromHtml(html: string) {
  if (typeof window === "undefined") {
    return "";
  }

  const parser = new window.DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  return parsed.body.textContent ?? "";
}

function clipboardContainsStructuredTable(event: ClipboardEvent) {
  const clipboardData = event.clipboardData;
  if (!clipboardData) {
    return false;
  }

  const htmlPayload = [
    clipboardData.getData("blocknote/html"),
    clipboardData.getData("text/html"),
  ]
    .filter(Boolean)
    .join("\n");

  return /<(table|tbody|thead|tr|td|th)\b/i.test(htmlPayload);
}

function getSafePlainText(event: ClipboardEvent) {
  const clipboardData = event.clipboardData;
  if (!clipboardData) {
    return "";
  }

  const plainText = clipboardData.getData("text/plain");
  if (plainText) {
    return plainText;
  }

  const html = clipboardData.getData("text/html");
  if (html) {
    return extractPlainTextFromHtml(html);
  }

  return "";
}

export function safeBlockNotePasteHandler({
  event,
  editor,
  defaultPasteHandler,
}: SafePasteContext) {
  const cursorPosition = editor.getTextCursorPosition();
  const currentBlock = cursorPosition.block;
  const isHeadingBlock = currentBlock.type === "heading";

  if (isHeadingBlock && clipboardContainsStructuredTable(event)) {
    const plainText = getSafePlainText(event);
    editor.pasteText(plainText);
    return true;
  }

  return defaultPasteHandler();
}

import { BlockNoteEditor } from "@blocknote/core";
import { blocksToYDoc, yDocToBlocks } from "@blocknote/core/yjs";
import * as Y from "yjs";

type BlockNoteSnapshot = unknown;

function normalizeBlocks(snapshot: BlockNoteSnapshot) {
  return Array.isArray(snapshot) ? snapshot : [];
}

export function snapshotToYjsState(snapshot: BlockNoteSnapshot) {
  let blocks = normalizeBlocks(snapshot);
  if (!Array.isArray(snapshot) && typeof snapshot === "string") {
    try {
      const parsed = JSON.parse(snapshot);
      blocks = normalizeBlocks(parsed);
    } catch {
      blocks = [];
    }
  }
  const editor = BlockNoteEditor.create();
  const ydoc = blocksToYDoc(editor, blocks, "document-store");
  const state = Y.encodeStateAsUpdate(ydoc);
  return Buffer.from(state).toString("base64");
}

export function yjsStateToSnapshot(encodedState: string | null | undefined) {
  if (!encodedState) return [];
  try {
    const editor = BlockNoteEditor.create();
    const ydoc = new Y.Doc();
    const state = Buffer.from(encodedState, "base64");
    Y.applyUpdate(ydoc, state);
    return yDocToBlocks(editor, ydoc, "document-store");
  } catch {
    return [];
  }
}

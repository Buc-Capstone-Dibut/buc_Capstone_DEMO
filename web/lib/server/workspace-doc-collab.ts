import { BlockNoteEditor } from "@blocknote/core";
import { blocksToYDoc, yDocToBlocks } from "@blocknote/core/yjs";
import * as Y from "yjs";

type BlockNoteSnapshot = unknown;

export const MAX_WORKSPACE_DOC_YJS_BYTES = 3 * 1024 * 1024;

export class InvalidWorkspaceDocYjsStateError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 = 400,
  ) {
    super(message);
    this.name = "InvalidWorkspaceDocYjsStateError";
  }
}

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
  return decodeWorkspaceDocYjsState(encodedState).snapshot;
}

export function decodeWorkspaceDocYjsState(
  encodedState: string | null | undefined,
) {
  if (!encodedState) {
    throw new InvalidWorkspaceDocYjsStateError(
      "Yjs 문서 상태가 비어 있습니다.",
    );
  }

  try {
    const normalizedInput = encodedState.trim();
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalizedInput)) {
      throw new InvalidWorkspaceDocYjsStateError(
        "Yjs 문서 상태가 올바른 Base64 형식이 아닙니다.",
      );
    }

    const state = Buffer.from(normalizedInput, "base64");
    if (state.byteLength === 0) {
      throw new InvalidWorkspaceDocYjsStateError(
        "Yjs 문서 상태가 비어 있습니다.",
      );
    }

    if (state.byteLength > MAX_WORKSPACE_DOC_YJS_BYTES) {
      throw new InvalidWorkspaceDocYjsStateError(
        "문서 협업 상태가 저장 가능한 크기를 초과했습니다.",
        413,
      );
    }

    const normalizedRoundTrip = state.toString("base64").replace(/=+$/, "");
    if (normalizedRoundTrip !== normalizedInput.replace(/=+$/, "")) {
      throw new InvalidWorkspaceDocYjsStateError(
        "Yjs 문서 상태의 Base64 데이터가 손상되었습니다.",
      );
    }

    const editor = BlockNoteEditor.create();
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, state);
    const snapshot = yDocToBlocks(editor, ydoc, "document-store");

    if (!Array.isArray(snapshot)) {
      throw new InvalidWorkspaceDocYjsStateError(
        "Yjs 문서 상태를 BlockNote 문서로 변환하지 못했습니다.",
      );
    }

    return {
      snapshot,
      byteLength: state.byteLength,
    };
  } catch (error) {
    if (error instanceof InvalidWorkspaceDocYjsStateError) {
      throw error;
    }

    throw new InvalidWorkspaceDocYjsStateError(
      "손상된 Yjs 문서 상태를 저장하지 않았습니다.",
    );
  }
}

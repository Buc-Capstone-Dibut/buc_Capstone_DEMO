import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeWorkspaceDocYjsState,
  InvalidWorkspaceDocYjsStateError,
  MAX_WORKSPACE_DOC_YJS_BYTES,
  snapshotToYjsState,
} from "./workspace-doc-collab";

const paragraphSnapshot = [
  {
    id: "doc-test-paragraph",
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "default",
      textAlignment: "left",
    },
    content: [
      {
        type: "text",
        text: "Debut 문서 저장 회귀 테스트",
        styles: {},
      },
    ],
    children: [],
  },
];

test("BlockNote snapshot and Yjs state round-trip without losing content", () => {
  const encoded = snapshotToYjsState(paragraphSnapshot);
  const decoded = decodeWorkspaceDocYjsState(encoded);

  assert.ok(decoded.byteLength > 0);
  assert.equal(decoded.snapshot.length, 1);
  assert.match(JSON.stringify(decoded.snapshot), /Debut 문서 저장 회귀 테스트/);
});

test("invalid Base64 is rejected instead of being saved as an empty document", () => {
  assert.throws(
    () => decodeWorkspaceDocYjsState("not-a-valid-yjs-state!"),
    (error: unknown) =>
      error instanceof InvalidWorkspaceDocYjsStateError &&
      error.status === 400,
  );
});

test("oversized collaboration state is rejected before decoding", () => {
  const oversized = Buffer.alloc(MAX_WORKSPACE_DOC_YJS_BYTES + 1).toString(
    "base64",
  );

  assert.throws(
    () => decodeWorkspaceDocYjsState(oversized),
    (error: unknown) =>
      error instanceof InvalidWorkspaceDocYjsStateError &&
      error.status === 413,
  );
});

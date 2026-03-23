export type DocTreeItem = {
  id: string;
  kind: "page" | "folder";
  parent_id: string | null;
  sort_order?: number;
};

export type DropPosition = "before" | "after" | "inside";

export type DocMovePatch = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

type ComputeMoveResult =
  | {
      ok: true;
      patches: DocMovePatch[];
    }
  | {
      ok: false;
      reason: string;
    };

function getOrderedSiblingIds(
  docs: DocTreeItem[],
  parentId: string | null,
  excludeId?: string,
) {
  return docs
    .filter(
      (doc) => doc.parent_id === parentId && (!excludeId || doc.id !== excludeId),
    )
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
    .map((doc) => doc.id);
}

function collectDescendantIds(docs: DocTreeItem[], docId: string) {
  const descendants = new Set<string>();
  const queue = [docId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) continue;

    for (const child of docs) {
      if (child.parent_id === currentId && !descendants.has(child.id)) {
        descendants.add(child.id);
        queue.push(child.id);
      }
    }
  }

  return descendants;
}

export function computeDocMove(
  docs: DocTreeItem[],
  sourceId: string,
  targetId: string,
  position: DropPosition,
): ComputeMoveResult {
  const source = docs.find((doc) => doc.id === sourceId);
  const target = docs.find((doc) => doc.id === targetId);

  if (!source || !target) {
    return { ok: false, reason: "문서를 찾을 수 없습니다." };
  }

  if (sourceId === targetId) {
    return { ok: false, reason: "같은 문서로는 이동할 수 없습니다." };
  }

  if (position === "inside" && target.kind !== "folder") {
    return { ok: false, reason: "폴더 안으로만 넣을 수 있습니다." };
  }

  const nextParentId = position === "inside" ? target.id : target.parent_id;
  const descendants = collectDescendantIds(docs, sourceId);

  if (nextParentId === sourceId || (nextParentId && descendants.has(nextParentId))) {
    return { ok: false, reason: "자기 자신 또는 하위 문서 안으로는 이동할 수 없습니다." };
  }

  const sourceParentId = source.parent_id;

  if (sourceParentId === nextParentId) {
    const siblingIds = getOrderedSiblingIds(docs, sourceParentId, sourceId);
    const targetIndex = siblingIds.indexOf(targetId);

    if (targetIndex === -1) {
      return { ok: false, reason: "대상 위치를 계산할 수 없습니다." };
    }

    const insertIndex =
      position === "after"
        ? targetIndex + 1
        : position === "inside"
          ? siblingIds.length
          : targetIndex;

    siblingIds.splice(insertIndex, 0, sourceId);

    const patches = siblingIds.map((id, index) => ({
      id,
      parentId: sourceParentId,
      sortOrder: index,
    }));

    return { ok: true, patches };
  }

  const sourceSiblingIds = getOrderedSiblingIds(docs, sourceParentId, sourceId);
  const targetSiblingIds = getOrderedSiblingIds(docs, nextParentId, sourceId);

  const targetIndex =
    position === "inside"
      ? targetSiblingIds.length
      : targetSiblingIds.indexOf(targetId) + (position === "after" ? 1 : 0);

  if (position !== "inside" && targetIndex < 0) {
    return { ok: false, reason: "대상 위치를 계산할 수 없습니다." };
  }

  targetSiblingIds.splice(targetIndex, 0, sourceId);

  const sourcePatches = sourceSiblingIds.map((id, index) => ({
    id,
    parentId: sourceParentId,
    sortOrder: index,
  }));
  const targetPatches = targetSiblingIds.map((id, index) => ({
    id,
    parentId: nextParentId,
    sortOrder: index,
  }));

  return {
    ok: true,
    patches: [...sourcePatches, ...targetPatches],
  };
}

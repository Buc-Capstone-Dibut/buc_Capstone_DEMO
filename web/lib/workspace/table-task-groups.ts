export type TableTaskGroupBase = {
  key: string;
};

/**
 * Keep configured table sections visible even when no task currently belongs
 * to them. Populated groups replace their empty seed while preserving the
 * configured section order; unexpected groups are appended as a fallback.
 */
export function mergeTableTaskGroups<TGroup extends TableTaskGroupBase>(
  configuredGroups: readonly TGroup[],
  populatedGroups: readonly TGroup[],
): TGroup[] {
  const populatedByKey = new Map(
    populatedGroups.map((group) => [group.key, group]),
  );
  const configuredKeys = new Set(
    configuredGroups.map((group) => group.key),
  );

  return [
    ...configuredGroups.map(
      (group) => populatedByKey.get(group.key) ?? group,
    ),
    ...populatedGroups.filter((group) => !configuredKeys.has(group.key)),
  ];
}

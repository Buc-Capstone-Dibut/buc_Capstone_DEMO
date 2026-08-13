import assert from "node:assert/strict";
import test from "node:test";

import { mergeTableTaskGroups } from "./table-task-groups";

type TestGroup = {
  key: string;
  tasks: string[];
};

test("keeps every configured section when there are no tasks", () => {
  const groups = mergeTableTaskGroups<TestGroup>(
    [
      { key: "todo", tasks: [] },
      { key: "in-progress", tasks: [] },
      { key: "done", tasks: [] },
    ],
    [],
  );

  assert.deepEqual(
    groups.map((group) => [group.key, group.tasks.length]),
    [
      ["todo", 0],
      ["in-progress", 0],
      ["done", 0],
    ],
  );
});

test("fills configured sections and appends an unexpected fallback group", () => {
  const groups = mergeTableTaskGroups<TestGroup>(
    [
      { key: "todo", tasks: [] },
      { key: "done", tasks: [] },
    ],
    [
      { key: "done", tasks: ["task-1"] },
      { key: "unknown", tasks: ["task-2"] },
    ],
  );

  assert.deepEqual(groups, [
    { key: "todo", tasks: [] },
    { key: "done", tasks: ["task-1"] },
    { key: "unknown", tasks: ["task-2"] },
  ]);
});

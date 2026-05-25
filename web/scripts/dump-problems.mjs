import { module01Problems } from "../data/ctp/problems/module-01-problems.ts";
import { module02Problems } from "../data/ctp/problems/module-02-problems.ts";
import { module03Problems } from "../data/ctp/problems/module-03-problems.ts";
import { module04Problems } from "../data/ctp/problems/module-04-problems.ts";
import fs from "node:fs";

const all = {
  "module-01": module01Problems,
  "module-02": module02Problems,
  "module-03": module03Problems,
  "module-04": module04Problems,
};

const out = process.argv[2] ?? "/tmp/ctp_problems_dump.json";
fs.writeFileSync(out, JSON.stringify(all, null, 2));
console.log("dumped", Object.entries(all).map(([k, v]) => `${k}=${v.length}`).join(", "), "→", out);

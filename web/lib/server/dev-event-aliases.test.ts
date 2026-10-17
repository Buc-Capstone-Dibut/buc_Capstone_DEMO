import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";

test("merged event IDs resolve to the canonical event outside the first list page", async () => {
  const canonicalId = "0675ba33-f227-5fb0-b9fb-893df9466860";
  const aliasId = "83ac1c47-6a30-4b71-8388-38818c13e062";
  const events = Array.from({ length: 14 }, (_, index) => ({ id: index === 13 ? canonicalId : `event-${index}`, title: "활동", tags: [], link: "https://example.com" }));
  const calls: { table: string; id?: unknown }[] = [];
  const client = {
    from(table: string) {
      const call: { table: string; id?: unknown } = { table };
      calls.push(call);
      const query = {
        select() { return query; },
        eq(_key: string, id: unknown) { call.id = id; return query; },
        order: async () => ({ data: events, error: null }),
        maybeSingle: async () => ({ data: call.id === aliasId ? { event_id: canonicalId } : null, error: null }),
      };
      return query;
    },
  };
  const globals = globalThis as typeof globalThis & { devEventAliasTest?: typeof client };
  globals.devEventAliasTest = client;
  try {
    const bundle = await build({
      entryPoints: [fileURLToPath(new URL("./dev-events.ts", import.meta.url))],
      bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
      plugins: [{ name: "alias-dependencies", setup(builder) {
        const stubs: Record<string, string> = {
          "@/lib/supabase/server": "export const createClient = async () => globalThis.devEventAliasTest;",
          "@/lib/prisma": "export default {};",
        };
        builder.onResolve({ filter: /.*/ }, ({ path }) => Object.hasOwn(stubs, path) ? { path, namespace: "stub" } : undefined);
        builder.onLoad({ filter: /.*/, namespace: "stub" }, ({ path }) => ({ contents: stubs[path], loader: "js" }));
      } }],
    });
    const mod = { exports: {} as { fetchDevEventById: (id: string) => Promise<{ id: string } | null> } };
    new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
    assert.equal((await mod.exports.fetchDevEventById(canonicalId))?.id, canonicalId);
    assert.equal(calls.length, 1);
    assert.equal((await mod.exports.fetchDevEventById(aliasId))?.id, canonicalId);
    assert.deepEqual(calls.at(-1), { table: "dev_event_aliases", id: aliasId });
    assert.equal(await mod.exports.fetchDevEventById("invalid-id"), null);
    assert.equal(calls.length, 2);
    assert.equal(await mod.exports.fetchDevEventById("00000000-0000-0000-0000-000000000000"), null);
  } finally {
    delete globals.devEventAliasTest;
  }
});

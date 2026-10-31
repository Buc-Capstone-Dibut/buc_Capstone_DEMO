import assert from "node:assert/strict";
import test from "node:test";
import { isSttTraceEnabled, rememberSttTracePreference } from "./stt-trace";

function withBrowser(run: (location: { search: string }) => void, storageUnavailable = false) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const environment = process.env as Record<string, string | undefined>;
  const previousMode = environment.NODE_ENV;
  environment.NODE_ENV = "production";
  const location = { search: "" };
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    location,
    get sessionStorage() {
      if (storageUnavailable) throw new Error("storage unavailable");
      return storage;
    },
  } });
  try {
    run(location);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
    if (previousMode === undefined) delete environment.NODE_ENV;
    else environment.NODE_ENV = previousMode;
  }
}

test("production tracing is opt-in and follows the same tab from setup to room", () => withBrowser(location => {
  assert.equal(isSttTraceEnabled(), false);
  location.search = "?debugStt=1";
  rememberSttTracePreference();
  location.search = "?duration=15&sessionId=example";
  assert.equal(isSttTraceEnabled(), true);
  location.search = "?debugStt=0";
  rememberSttTracePreference();
  location.search = "";
  assert.equal(isSttTraceEnabled(), false);
}));

test("a URL trace flag still works when session storage is blocked", () => withBrowser(location => {
  location.search = "?debugStt=1";
  assert.doesNotThrow(rememberSttTracePreference);
  assert.equal(isSttTraceEnabled(), true);
  location.search = "";
  assert.equal(isSttTraceEnabled(), false);
}, true));

// Node ESM loader stub for CSS module imports under `tsx --test`.
// CSS imports return a Proxy that resolves any property to the property name itself
// (a reasonable approximation of CSS Modules — every class name maps to itself).
const CSS_STUB_URL = "file:///__css-stub__.mjs";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith(".css")) {
    return { shortCircuit: true, url: CSS_STUB_URL, format: "module" };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === CSS_STUB_URL) {
    return {
      shortCircuit: true,
      format: "module",
      source:
        "export default new Proxy({}, { get: (_, p) => typeof p === 'string' ? p : '' });",
    };
  }
  return nextLoad(url, context);
}

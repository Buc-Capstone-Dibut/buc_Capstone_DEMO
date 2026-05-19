// Register the CSS stub loader so `import "./foo.module.css"` returns a Proxy.
// Usage: node --import ./test/register-css-stub.mjs --import tsx --test path/to/test.ts
import { register } from "node:module";

register("./css-stub-loader.mjs", import.meta.url);

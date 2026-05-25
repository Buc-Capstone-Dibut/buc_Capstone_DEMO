import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const rootDir = process.cwd();
const componentPath = join(
  rootDir,
  "components/features/site-helper-chat/site-helper-chat.tsx",
);
const globalCssPath = join(rootDir, "app/globals.css");
const mascotPath = join(rootDir, "public/images/site-helper-ai-chat.png");

test("site helper trigger uses mascot asset with animated green ring", () => {
  const component = readFileSync(componentPath, "utf8");
  const globalCss = readFileSync(globalCssPath, "utf8");

  assert.ok(existsSync(mascotPath), "chatbot mascot image should be available");
  assert.match(component, /\/images\/site-helper-ai-chat\.png/);
  assert.match(component, /site-helper-chat-trigger/);
  assert.match(component, /site-helper-chat-mascot/);
  assert.match(component, /relative/);
  assert.match(component, /overflow-visible/);
  assert.match(component, /h-\[95px\] w-\[95px\]/);
  assert.match(component, /h-\[85px\] w-\[85px\]/);
  assert.match(globalCss, /\.site-helper-chat-trigger::before/);
  assert.match(globalCss, /site-helper-ring-fill/);
  assert.match(globalCss, /conic-gradient\(\s*from 0deg/);
  assert.match(globalCss, /animation: none/);
  assert.match(globalCss, /\.site-helper-chat-trigger:hover::before\s*{\s*animation: site-helper-ring-fill 0\.7s linear infinite/);
});

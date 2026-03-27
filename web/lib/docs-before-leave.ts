type DocsBeforeLeaveHandler = () => Promise<boolean>;

let docsBeforeLeaveHandler: DocsBeforeLeaveHandler | null = null;

export function registerDocsBeforeLeaveHandler(
  handler: DocsBeforeLeaveHandler | null,
) {
  docsBeforeLeaveHandler = handler;

  return () => {
    if (docsBeforeLeaveHandler === handler) {
      docsBeforeLeaveHandler = null;
    }
  };
}

export async function runDocsBeforeLeaveHandler() {
  if (!docsBeforeLeaveHandler) {
    return true;
  }

  return docsBeforeLeaveHandler();
}

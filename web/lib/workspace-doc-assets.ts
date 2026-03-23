export const WORKSPACE_DOC_ASSET_SCHEME = "supabase-doc-asset://";

export function createWorkspaceDocAssetUrl(workspaceId: string, assetId: string) {
  return `${WORKSPACE_DOC_ASSET_SCHEME}${workspaceId}/${assetId}`;
}

export function parseWorkspaceDocAssetUrl(url: string) {
  if (!url.startsWith(WORKSPACE_DOC_ASSET_SCHEME)) {
    return null;
  }

  const path = url.slice(WORKSPACE_DOC_ASSET_SCHEME.length);
  const [workspaceId, assetId] = path.split("/");

  if (!workspaceId || !assetId) {
    return null;
  }

  return { workspaceId, assetId };
}

export function createWorkspaceDocAssetAccessPath(
  workspaceId: string,
  assetId: string,
) {
  return `/api/workspaces/${workspaceId}/docs/assets/${assetId}`;
}

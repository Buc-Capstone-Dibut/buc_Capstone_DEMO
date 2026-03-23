export type WorkspaceDocCommentProfile = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  handle: string;
};

export type WorkspaceDocComment = {
  id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  resolved_at: string | null;
  resolved_by: string | null;
  author: WorkspaceDocCommentProfile;
  resolver?: WorkspaceDocCommentProfile | null;
};

export type WorkspaceDocCommentNode = WorkspaceDocComment & {
  replies: WorkspaceDocCommentNode[];
};

export function buildWorkspaceDocCommentTree(
  comments: WorkspaceDocComment[],
): WorkspaceDocCommentNode[] {
  const nodes = new Map<string, WorkspaceDocCommentNode>();

  comments.forEach((comment) => {
    nodes.set(comment.id, { ...comment, replies: [] });
  });

  const roots: WorkspaceDocCommentNode[] = [];

  comments.forEach((comment) => {
    const node = nodes.get(comment.id);
    if (!node) return;

    if (comment.parent_id) {
      const parent = nodes.get(comment.parent_id);
      if (parent) {
        parent.replies.push(node);
        return;
      }
    }

    roots.push(node);
  });

  const sortNodes = (items: WorkspaceDocCommentNode[]) => {
    items.sort((a, b) => {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
    items.forEach((item) => sortNodes(item.replies));
  };

  sortNodes(roots);
  return roots;
}

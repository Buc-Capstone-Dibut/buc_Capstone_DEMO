-- Document editing now uses the regular workspace_docs snapshot save path.
-- Whiteboard Yjs persistence is intentionally unaffected.
drop table if exists public.workspace_doc_live_presence;
drop table if exists public.workspace_doc_collab_sessions;
drop table if exists public.workspace_doc_revisions;
drop table if exists public.workspace_doc_states;

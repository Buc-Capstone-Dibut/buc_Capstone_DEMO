# Workspace Schema Canonical Source

`web/prisma/schema.prisma` is the canonical schema for workspace-domain changes.

This applies to workspace domain models such as:

- workspace lifecycle and membership
- board and view models
- docs and collaboration models
- workspace chat models
- workspace whiteboard models

## Working Rule

1. Update `web/prisma/schema.prisma` first.
2. Treat `workspace-server/prisma/schema.prisma` as a follower schema.
3. Remove temporary raw SQL or compatibility fallbacks only after the follower schema and generated client are aligned.

## Why This Exists

The repo currently has two Prisma schemas touching the same workspace database contract.
This file keeps future student contributors from having to guess which file is the source of truth.

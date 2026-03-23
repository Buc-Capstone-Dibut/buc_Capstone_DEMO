const DEFAULT_PAGE_LIMIT = 10;
const MAX_PAGE_LIMIT = 20;

export type ProfileCursor = {
  createdAt: string;
  id: string;
};

export function parsePageLimit(rawValue: string | null | undefined): number {
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PAGE_LIMIT;
  }

  return Math.min(Math.max(Math.floor(parsed), 1), MAX_PAGE_LIMIT);
}

export function decodeProfileCursor(
  rawValue: string | null | undefined,
): ProfileCursor | null {
  if (!rawValue) return null;

  try {
    const decoded = Buffer.from(rawValue, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<ProfileCursor>;

    if (
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string"
    ) {
      return null;
    }

    return {
      createdAt: parsed.createdAt,
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

export function encodeProfileCursor(input: {
  createdAt: Date | string | null | undefined;
  id: string | null | undefined;
}): string | null {
  if (!input.id || !input.createdAt) {
    return null;
  }

  const createdAt =
    input.createdAt instanceof Date
      ? input.createdAt.toISOString()
      : String(input.createdAt);

  return Buffer.from(
    JSON.stringify({
      createdAt,
      id: input.id,
    }),
    "utf8",
  ).toString("base64url");
}

export function buildCreatedAtCursorWhere(
  cursor: ProfileCursor | null,
  createdAtField: string,
) {
  if (!cursor) return {};

  const cursorDate = new Date(cursor.createdAt);
  if (Number.isNaN(cursorDate.getTime())) {
    return {};
  }

  return {
    OR: [
      {
        [createdAtField]: {
          lt: cursorDate,
        },
      },
      {
        AND: [
          {
            [createdAtField]: {
              equals: cursorDate,
            },
          },
          {
            id: {
              lt: cursor.id,
            },
          },
        ],
      },
    ],
  };
}

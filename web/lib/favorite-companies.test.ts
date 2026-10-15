import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeFavoriteCompanies,
  readFavoriteCompanies,
} from "@/lib/favorite-companies";

test("favorite companies are trimmed and de-duplicated", () => {
  assert.deepEqual(
    normalizeFavoriteCompanies([" 토스 ", "토스", "Kakao", "kakao", null]),
    ["토스", "Kakao"],
  );
});

test("favorite companies are read from a settings payload", () => {
  assert.deepEqual(
    readFavoriteCompanies({ favoriteCompanies: ["네이버", "당근"] }),
    ["네이버", "당근"],
  );
  assert.deepEqual(readFavoriteCompanies(null), []);
});

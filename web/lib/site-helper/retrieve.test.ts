import assert from "node:assert/strict";
import test from "node:test";
import {
  findCurrentSiteHelperPage,
  retrieveSiteHelperKnowledge,
} from "./retrieve";

test("portfolio questions resolve to the portfolio page", () => {
  const result = retrieveSiteHelperKnowledge("포트폴리오는 어디서 만들어?");

  assert.equal(result.matches[0]?.route, "/career/portfolios");
});

test("interview questions resolve to the interview hub", () => {
  const result = retrieveSiteHelperKnowledge("AI 면접은 어떻게 시작해?");

  assert.equal(result.matches[0]?.route, "/interview");
});

test("squad questions resolve to team recruiting", () => {
  const result = retrieveSiteHelperKnowledge("프로젝트 팀원 모집은 어디서 해?");

  assert.equal(result.matches[0]?.route, "/community/squad");
});

test("short board terms resolve to community board instead of tech blog", () => {
  const result = retrieveSiteHelperKnowledge("게시글");

  assert.equal(result.matches[0]?.route, "/community/board");
});

test("board writing questions resolve to the write page", () => {
  const result = retrieveSiteHelperKnowledge("게시글 작성은 어디서 해?");

  assert.equal(result.matches[0]?.route, "/community/board/write");
});

test("tier questions resolve to the tier system page", () => {
  const result = retrieveSiteHelperKnowledge("티어는 어떻게 올려?");

  assert.equal(result.matches[0]?.route, "/tier-system");
});

test("current page fallback is returned when query has no match", () => {
  const result = retrieveSiteHelperKnowledge("와리가리", "/insights/ctp/module");

  assert.equal(result.currentPage?.route, "/insights/ctp");
  assert.equal(result.matches[0]?.route, "/insights/ctp");
});

test("current page matcher prefers the longest route", () => {
  const page = findCurrentSiteHelperPage("/interview/training/portfolio/report");

  assert.equal(page?.route, "/interview/training/portfolio");
});

import assert from "node:assert/strict";
import test from "node:test";
import { normalizeResumePayload } from "@/app/my/[handle]/profile-utils";
import { educationListSchema, formatEducationPeriod, getVisibleEducation, normalizeEducation } from "./education";

test("기존 학교·전공·기간을 월 단위 학력으로 옮기고 제외한 추가 정보는 저장하지 않는다", () => {
  const input = [{ school: "○○대학교", major: "컴퓨터공학과", period: "2022.03 ~ 2026.02", status: "졸업 예정", degree: "학사", gpa: "4.0" }];
  const [item] = normalizeEducation(input);
  assert.equal(item.startDate, "2022-03");
  assert.equal(item.endDate, "2026-02");
  assert.equal(item.status, "expected");
  assert.equal("degree" in item, false);
  assert.equal("gpa" in item, false);
  assert.equal(normalizeEducation(input)[0].id, item.id);
  assert.equal(formatEducationPeriod(item), "2022.03 – 2026.02");
});

test("학교를 여러 개 등록해도 이력서별 출력 선택은 저장·불러오기 후 유지된다", () => {
  const education = normalizeEducation([
    { id: "university", school: "대학교", startDate: "2022-03", endDate: "2026-02", status: "graduated" },
    { id: "highschool", school: "고등학교", startDate: "2019-03", endDate: "2022-02", status: "graduated", included: false },
  ]);
  const payload = normalizeResumePayload(JSON.parse(JSON.stringify({ education })));
  assert.equal(payload.education.length, 2);
  assert.equal(payload.education[1].included, false);
  assert.deepEqual(getVisibleEducation(payload.education).map((item) => item.id), ["university"]);
});

test("최신 학력을 먼저 출력하고 재학은 현재로 표시한다", () => {
  const education = getVisibleEducation([
    { school: "이전 학교", startDate: "2019-03", endDate: "2022-02", status: "graduated" },
    { school: "졸업 학교", startDate: "2022-03", endDate: "2026-02", status: "graduated" },
    { school: "현재 학교", startDate: "2026-03", status: "enrolled" },
  ]);
  assert.deepEqual(education.map((item) => item.school), ["현재 학교", "졸업 학교", "이전 학교"]);
  assert.equal(formatEducationPeriod(education[0]), "2026.03 – 현재");
});

test("연도만 기재된 기존 학력의 기간을 보존한다", () => {
  const [item] = normalizeEducation([{ school: "기존 학교", period: "2018 – 2022" }]);
  assert.equal(formatEducationPeriod(item), "2018 – 2022");
});

test("누락된 학력과 학교 없는 업로드 항목은 빈 목록으로 처리한다", () => {
  assert.deepEqual(normalizeEducation(undefined), []);
  assert.deepEqual(normalizeEducation([null, "학력", { school: "  " }]), []);
  assert.deepEqual(normalizeResumePayload({}).education, []);
});

test("저장은 학교명·실제 월·기간 순서를 검증하고 졸업 예정의 미래 날짜는 허용한다", () => {
  const [item] = normalizeEducation([{ id: "entry", school: "대학교", startDate: "2022-03", endDate: "2027-02", status: "expected" }]);
  assert.equal(educationListSchema.safeParse([item]).success, true);
  assert.equal(educationListSchema.safeParse([{ ...item, school: " " }]).success, false);
  assert.equal(educationListSchema.safeParse([{ ...item, endDate: "2021-02" }]).success, false);
  assert.equal(educationListSchema.safeParse([{ ...item, endDate: "2027-13" }]).success, false);
  assert.equal(educationListSchema.safeParse([item, item]).success, false);
  assert.equal(educationListSchema.safeParse([]).success, true);
});

"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";

// 한국어 폰트 등록 (모듈 최상단에서 1회 실행).
// jsdelivr CDN에서 Noto Sans KR ttf를 직접 받아 한글 글리프를 PDF에 임베드한다.
// CDN 차단 환경에서는 web/public/fonts 에 ttf를 배치하고 /fonts/... 경로를 사용해도 된다.
Font.register({
  family: "Noto Sans KR",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/notosanskr@1.0.0/Noto_Sans_KR/NotoSansKR-Regular.ttf",
      fontWeight: "normal",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/notosanskr@1.0.0/Noto_Sans_KR/NotoSansKR-Bold.ttf",
      fontWeight: "bold",
    },
  ],
});

// CJK 문자 자동 줄바꿈 hyphenation 비활성화 (글자 단위로 줄바꿈 허용)
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: "Noto Sans KR",
    fontSize: 10,
    padding: 40,
    paddingBottom: 56,
    lineHeight: 1.5,
    color: "#1a202c",
  },
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  name: { fontSize: 20, fontWeight: "bold" },
  contact: { fontSize: 9, color: "#64748b", marginTop: 4 },
  intro: { marginTop: 6, fontSize: 9.5, color: "#475569" },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
  },
  entry: { marginBottom: 8 },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  entryHeaderEducation: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  entryTitle: { fontSize: 10, fontWeight: "bold", flexShrink: 1, paddingRight: 8 },
  entryMeta: { fontSize: 9, color: "#64748b", flexShrink: 0 },
  entryDesc: { fontSize: 9.5, marginTop: 2 },
  bulletRow: { flexDirection: "row", marginTop: 2 },
  bullet: { width: 8, fontSize: 9.5 },
  bulletText: { flex: 1, fontSize: 9.5 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap" },
  skillChip: {
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    marginRight: 4,
    marginBottom: 4,
  },
  selfIntroText: {
    fontSize: 9.5,
    lineHeight: 1.6,
    color: "#334155",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

type Education = {
  school?: string;
  major?: string;
  period?: string;
  degree?: string;
};

function extractEducation(value: unknown): Education[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const row = raw as Record<string, unknown>;
      const out: Education = {};
      if (typeof row.school === "string") out.school = row.school;
      if (typeof row.major === "string") out.major = row.major;
      if (typeof row.period === "string") out.period = row.period;
      if (typeof row.degree === "string") out.degree = row.degree;
      return out;
    })
    .filter((row): row is Education => row !== null);
}

function splitDescriptionLines(value: string | undefined, limit = 6): string[] {
  if (!value) return [];
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function collectLinks(links: ResumePayload["personalInfo"]["links"] | undefined): string[] {
  if (!links) return [];
  return Object.values(links)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

export function ResumePdfDocument({
  resume,
  title,
}: {
  resume: ResumePayload;
  title?: string;
}) {
  const pi = resume.personalInfo ?? {
    name: "",
    email: "",
    phone: "",
    intro: "",
    links: {},
  };
  const linkUrls = collectLinks(pi.links);
  const contactBits = [pi.email, pi.phone].filter(
    (value): value is string => Boolean(value && value.trim()),
  );
  const educationList = extractEducation(resume.education);
  const experiences = resume.experience ?? [];
  const projects = resume.projects ?? [];
  const skills = resume.skills ?? [];
  const selfIntroduction = resume.selfIntroduction?.trim();

  const documentTitle = title?.trim() || (pi.name ? `${pi.name} 이력서` : "이력서");

  return (
    <Document title={documentTitle} author={pi.name || "Dibut"}>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{pi.name || "이름"}</Text>
          {(contactBits.length > 0 || linkUrls.length > 0) && (
            <Text style={styles.contact}>
              {contactBits.join("  ·  ")}
              {contactBits.length > 0 && linkUrls.length > 0 ? "  ·  " : ""}
              {linkUrls.join(", ")}
            </Text>
          )}
          {pi.intro?.trim() ? <Text style={styles.intro}>{pi.intro}</Text> : null}
        </View>

        {/* Experience */}
        {experiences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>경력</Text>
            {experiences.map((exp, i) => {
              const lines = splitDescriptionLines(exp.description, 6);
              return (
                <View key={exp.id || i} style={styles.entry} wrap={false}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryTitle}>
                      {[exp.company, exp.position].filter(Boolean).join(" · ") || "회사 · 직책"}
                    </Text>
                    {exp.period ? <Text style={styles.entryMeta}>{exp.period}</Text> : null}
                  </View>
                  {lines.length === 1 ? (
                    <Text style={styles.entryDesc}>{lines[0]}</Text>
                  ) : (
                    lines.map((line, j) => (
                      <View key={j} style={styles.bulletRow}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{line}</Text>
                      </View>
                    ))
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>프로젝트</Text>
            {projects.map((project, i) => (
              <View key={project.id || i} style={styles.entry} wrap={false}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{project.name || "프로젝트"}</Text>
                  {project.period ? (
                    <Text style={styles.entryMeta}>{project.period}</Text>
                  ) : null}
                </View>
                {project.description?.trim() ? (
                  <Text style={styles.entryDesc}>{project.description}</Text>
                ) : null}
                {project.techStack?.length ? (
                  <View style={[styles.skillsRow, { marginTop: 4 }]}>
                    {project.techStack.map((tech, j) => (
                      <Text key={`${tech}-${j}`} style={styles.skillChip}>
                        {tech}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {project.achievements?.length
                  ? project.achievements.map((achievement, j) => (
                      <View key={j} style={styles.bulletRow}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{achievement}</Text>
                      </View>
                    ))
                  : null}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {educationList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>학력</Text>
            {educationList.map((edu, i) => {
              const titleParts = [edu.school, edu.major].filter(Boolean).join(" · ");
              const titleWithDegree = edu.degree
                ? `${titleParts} (${edu.degree})`
                : titleParts;
              return (
                <View key={i} style={styles.entryHeaderEducation} wrap={false}>
                  <Text style={styles.entryTitle}>{titleWithDegree || "학교 · 전공"}</Text>
                  {edu.period ? <Text style={styles.entryMeta}>{edu.period}</Text> : null}
                </View>
              );
            })}
          </View>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>기술 스택</Text>
            <View style={styles.skillsRow}>
              {skills.map((skill, i) => (
                <Text key={`${skill.name}-${i}`} style={styles.skillChip}>
                  {skill.name}
                  {skill.level ? ` (${skill.level})` : ""}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Self Introduction */}
        {selfIntroduction ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>자기소개</Text>
            <Text style={styles.selfIntroText}>{selfIntroduction}</Text>
          </View>
        ) : null}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${pi.name || documentTitle}  ·  ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

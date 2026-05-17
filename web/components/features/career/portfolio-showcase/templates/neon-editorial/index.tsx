"use client";

import type { CSSProperties } from "react";
import styles from "./styles.module.css";
import type { NeonEditorialContent, NeonEditorialTokens } from "./types";

export type NeonEditorialTemplateProps = {
  content: NeonEditorialContent;
  tokens: NeonEditorialTokens;
};

export function NeonEditorialTemplate({ content, tokens }: NeonEditorialTemplateProps) {
  const styleVars = {
    ["--accent"]: tokens.accent,
    ["--bg"]: "#0A0A0A",
    ["--bg-alt"]: "#111111",
    ["--bg-card"]: "#161616",
    ["--text-primary"]: "#F0F0F0",
    ["--text-secondary"]: "#888888",
    ["--border"]: "#222222",
  } as CSSProperties;

  const hasAbout =
    Boolean(content.about.quote) ||
    content.about.paragraphs.length > 0 ||
    content.about.strengths.length > 0;
  const hasExperienceSection = content.experience.length > 0 || content.education.length > 0;

  return (
    <div className={styles.root} style={styleVars} data-density={tokens.density}>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
      />

      <div className="cursor-ring" aria-hidden="true" />
      <div className="cursor-dot" aria-hidden="true" />
      <div className="scroll-progress" aria-hidden="true" />

      {/* HERO */}
      <section className="hero">
        <div className="hero-top">
          <span className="label accent">{content.hero.jobTitle}</span>
          <span className="label">{content.hero.year}</span>
        </div>
        <div className="hero-name">
          {content.hero.headlineLines.map((line, i) => {
            const isLast = i === content.hero.headlineLines.length - 1;
            return (
              <div className={`hero-line${isLast ? " sub" : ""}`} key={i}>
                <span className="word">{line}</span>
              </div>
            );
          })}
        </div>
        <div className="hero-bottom">
          <p className="bio">{content.hero.bio}</p>
          <span className="scroll-hint">
            SCROLL <span className="arrow">↓</span>
          </span>
        </div>
      </section>

      {/* MARQUEE */}
      {content.marqueeKeywords.length > 0 && (
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...content.marqueeKeywords, ...content.marqueeKeywords].map((kw, i) => (
              <span key={i}>
                {kw}
                <span className="star">✦</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ABOUT */}
      {hasAbout && (
        <section className="section about" id="about">
          <div className="section-head">
            <span className="label accent">01 / ABOUT</span>
            <h2 className="section-display">AB&nbsp;OUT</h2>
          </div>
          <div className="about-grid">
            <div className="about-quote">
              <blockquote>{content.about.quote}</blockquote>
            </div>
            <div className="about-body">
              {content.about.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
          {content.about.strengths.length > 0 && (
            <div className="strength-grid">
              {content.about.strengths.map((s, i) => (
                <div className="strength-card" key={i}>
                  <span className="strength-num">{s.num}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* WORKS */}
      {content.projects.length > 0 && (
        <section className="section works" id="works">
          <div className="section-head">
            <span className="label accent">02 / WORKS</span>
            <h2 className="section-display">WO&nbsp;RKS</h2>
          </div>
          <div className="works-list">
            {content.projects.map((p, i) => {
              const project = p as Record<string, unknown>;
              const title = String(project.company ?? project.position ?? "프로젝트");
              const role = String(project.position ?? "");
              const period = String(project.period ?? "");
              const tags = Array.isArray(project.techStack)
                ? (project.techStack as string[])
                : Array.isArray(project.tags)
                  ? (project.tags as string[])
                  : [];
              const num = String(i + 1).padStart(2, "0");
              return (
                <a className="work-row" href={`#work-${i}`} key={i}>
                  <span className="work-num">{num}</span>
                  <div className="work-info">
                    <h3>{title}</h3>
                    <span className="work-meta">
                      {[period, role].filter(Boolean).join(" — ")}
                    </span>
                  </div>
                  <div className="work-tags">{tags.slice(0, 5).join(" · ")}</div>
                  <span className="work-arrow">→</span>
                </a>
              );
            })}
          </div>
          {content.kpis.length > 0 && (
            <div className="kpi-spotlight">
              {content.kpis.map((k, i) => (
                <div className="kpi" key={i}>
                  <div className="kpi-num-wrap">
                    <span className="kpi-num" data-count={k.num}>
                      0
                    </span>
                    <span className="kpi-suffix">{k.suffix}</span>
                  </div>
                  <span className="kpi-label">{k.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* EXPERIENCE */}
      {hasExperienceSection && (
        <section className="section experience" id="experience">
          <div className="section-head">
            <span className="label accent">03 / EXPERIENCE</span>
            <h2 className="section-display">EXPE&nbsp;RI&nbsp;ENCE</h2>
          </div>
          {content.experience.length > 0 && (
            <div className="timeline">
              {content.experience.map((row, i) => (
                <div className="timeline-row" key={i}>
                  <span className="t-date">{row.date}</span>
                  <div className="t-info">
                    <h3>
                      {row.title} <span className="org">· {row.org}</span>
                    </h3>
                    <ul>
                      {row.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
          {content.education.length > 0 && (
            <>
              <div className="section-head subhead">
                <span className="label accent">EDUCATION</span>
              </div>
              <div className="timeline">
                {content.education.map((row, i) => (
                  <div className="timeline-row" key={i}>
                    <span className="t-date">{row.date}</span>
                    <div className="t-info">
                      <h3>
                        {row.title} <span className="org">· {row.org}</span>
                      </h3>
                      <ul>
                        {row.bullets.map((b, j) => (
                          <li key={j}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* CONTACT */}
      <section className="section contact" id="contact">
        <span className="label accent">04 / CONTACT</span>
        <h2 className="contact-display">
          <span className="line">
            <span>LET&apos;S</span>
          </span>
          <span className="line">
            <span className="accent">TALK.</span>
          </span>
        </h2>
        {content.contact.email && (
          <a className="magnetic-btn" href={`mailto:${content.contact.email}`}>
            <span>{content.contact.email.toUpperCase()}</span>
            <span className="arrow">→</span>
          </a>
        )}
        {content.contact.socials.length > 0 && (
          <div className="socials">
            {content.contact.socials.map((s, i) => (
              <a key={i} href={s.url} rel="noreferrer">
                {s.label}
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

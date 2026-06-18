"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./styles.module.css";
import type { NeonEditorialContent, NeonEditorialTokens } from "./types";

declare global {
  interface Window {
    gsap?: any;
    ScrollTrigger?: any;
  }
}

const GSAP_SRC = "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js";
const ST_SRC = "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js";

let gsapReadyPromise: Promise<void> | null = null;

function ensureGsap(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.gsap && window.ScrollTrigger) return Promise.resolve();
  if (gsapReadyPromise) return gsapReadyPromise;

  gsapReadyPromise = new Promise<void>((resolve) => {
    const loadOne = (src: string) =>
      new Promise<void>((res) => {
        const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
        if (existing) {
          if ((existing as any)._loaded) res();
          else existing.addEventListener("load", () => res(), { once: true });
          return;
        }
        const s = document.createElement("script");
        s.src = src;
        s.async = false;
        s.addEventListener(
          "load",
          () => {
            (s as any)._loaded = true;
            res();
          },
          { once: true },
        );
        document.head.appendChild(s);
      });
    loadOne(GSAP_SRC)
      .then(() => loadOne(ST_SRC))
      .then(() => resolve());
  });
  return gsapReadyPromise;
}

export type NeonEditorialTemplateProps = {
  content: NeonEditorialContent;
  tokens: NeonEditorialTokens;
  /**
   * GSAP entrance animation + custom cursor + scroll progress 활성화 여부.
   * wizard preview처럼 자체 scroll 컨테이너 안에서는 false로 두면 clip-path
   * starting state로 stuck 되는 문제를 회피하고 정적 preview를 보여준다.
   */
  animate?: boolean;
};

export function NeonEditorialTemplate({
  content,
  tokens,
  animate = true,
}: NeonEditorialTemplateProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // bg 토큰별 팔레트 — light 는 Debut 사이트 톤(밝은 바탕 + 그린 어센트), dark 는 기존 네온.
  const palette =
    tokens.bg === "dark"
      ? {
          ["--bg"]: "#0A0A0A",
          ["--bg-alt"]: "#111111",
          ["--bg-card"]: "#161616",
          ["--text-primary"]: "#F0F0F0",
          ["--text-secondary"]: "#888888",
          ["--border"]: "#222222",
          ["--grid-line"]: "rgba(240,240,240,0.04)",
        }
      : {
          ["--bg"]: "#fbfcf8",
          ["--bg-alt"]: "#f1f6ea",
          ["--bg-card"]: "#ffffff",
          ["--text-primary"]: "#1a2b18",
          ["--text-secondary"]: "#5c6b58",
          ["--border"]: "#dde7d2",
          ["--grid-line"]: "rgba(26,43,24,0.05)",
        };

  const styleVars = {
    ["--accent"]: tokens.accent,
    ...palette,
  } as CSSProperties;

  const hasAbout =
    Boolean(content.about.quote) ||
    content.about.paragraphs.length > 0 ||
    content.about.strengths.length > 0;
  const hasExperienceSection = content.experience.length > 0 || content.education.length > 0;

  useEffect(() => {
    if (!animate) return; // 정적 렌더(에디터/wizard preview)에선 entrance/scroll-progress skip (커서는 아래 별도 effect)
    let cancelled = false;
    const scopedTriggers: any[] = [];
    let stopProgress: (() => void) | null = null;

    ensureGsap().then(() => {
      if (cancelled || !rootRef.current) return;
      const { gsap, ScrollTrigger } = window as any;
      if (!gsap || !ScrollTrigger) return;
      gsap.registerPlugin(ScrollTrigger);
      const root = rootRef.current;
      const isCoarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 900;

      // 커스텀 커서는 animate(entrance 애니메이션)와 무관하게 아래 별도 useEffect 에서
      // 처리한다 — 에디터(animate=false)에서도 커서가 보이도록.

      // -------- Scroll progress --------
      const progress = root.querySelector<HTMLElement>(".scroll-progress");
      if (progress) {
        const update = () => {
          const sH = document.documentElement.scrollHeight - window.innerHeight;
          progress.style.width = sH > 0 ? `${(window.scrollY / sH) * 100}%` : "0%";
        };
        window.addEventListener("scroll", update, { passive: true });
        update();
        stopProgress = () => window.removeEventListener("scroll", update);
      }

      // -------- Hero entrance --------
      gsap.set(root.querySelectorAll(".hero-line .word"), {
        clipPath: "inset(0 0 100% 0)",
        yPercent: 8,
      });
      scopedTriggers.push(
        gsap.to(root.querySelectorAll(".hero-line .word"), {
          clipPath: "inset(0 0 0% 0)",
          yPercent: 0,
          duration: 1.2,
          stagger: 0.18,
          ease: "power4.out",
          delay: 0.25,
        }),
        gsap.from(root.querySelectorAll(".hero-top .label.accent"), {
          y: 20,
          opacity: 0,
          duration: 0.8,
          delay: 0.5,
          ease: "power3.out",
        }),
        gsap.from(root.querySelectorAll(".hero-top .label:not(.accent)"), {
          y: 20,
          opacity: 0,
          duration: 0.8,
          delay: 0.65,
          ease: "power3.out",
        }),
        gsap.from(root.querySelectorAll(".hero-bottom .bio"), {
          y: 20,
          opacity: 0,
          duration: 0.8,
          delay: 1.35,
          ease: "power3.out",
        }),
        gsap.from(root.querySelectorAll(".hero-bottom .scroll-hint"), {
          y: 20,
          opacity: 0,
          duration: 0.8,
          delay: 1.5,
          ease: "power3.out",
        }),
      );

      // -------- Section displays --------
      root.querySelectorAll<HTMLElement>(".section-display").forEach((el) => {
        const t = gsap.from(el, {
          y: 60,
          opacity: 0,
          duration: 1.0,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
        scopedTriggers.push(t.scrollTrigger);
        scopedTriggers.push(t);
      });

      // -------- About body / quote --------
      root
        .querySelectorAll<HTMLElement>(".about-quote blockquote, .about-body p")
        .forEach((el) => {
          const t = gsap.from(el, {
            y: 30,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%" },
          });
          scopedTriggers.push(t.scrollTrigger);
          scopedTriggers.push(t);
        });

      // -------- Strength cards --------
      const strength = root.querySelector(".strength-grid");
      if (strength) {
        const t = gsap.from(root.querySelectorAll(".strength-card"), {
          y: 30,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: strength, start: "top 85%" },
        });
        scopedTriggers.push(t.scrollTrigger);
        scopedTriggers.push(t);
      }

      // -------- Works rows --------
      const works = root.querySelector(".works-list");
      if (works) {
        const t = gsap.from(root.querySelectorAll(".work-row"), {
          x: -20,
          opacity: 0,
          duration: 0.7,
          stagger: 0.07,
          ease: "power3.out",
          scrollTrigger: { trigger: works, start: "top 85%" },
        });
        scopedTriggers.push(t.scrollTrigger);
        scopedTriggers.push(t);
      }

      // -------- Experience rows --------
      root.querySelectorAll<HTMLElement>(".timeline-row").forEach((el) => {
        const t = gsap.from(el, {
          y: 20,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
        scopedTriggers.push(t.scrollTrigger);
        scopedTriggers.push(t);
      });

      // -------- KPI count-up --------
      root.querySelectorAll<HTMLElement>(".kpi-num").forEach((el) => {
        const target = parseInt(el.dataset.count || "0", 10);
        const obj = { v: 0 };
        const t = ScrollTrigger.create({
          trigger: el,
          start: "top 85%",
          once: true,
          onEnter: () =>
            gsap.to(obj, {
              v: target,
              duration: 2,
              ease: "power2.out",
              onUpdate: () => {
                el.textContent = String(Math.round(obj.v));
              },
            }),
        });
        scopedTriggers.push(t);
      });

      // -------- Contact display reveal --------
      gsap.set(root.querySelectorAll(".contact-display .line > span"), { yPercent: 110 });
      const ct = ScrollTrigger.create({
        trigger: root.querySelector(".contact-display"),
        start: "top 80%",
        once: true,
        onEnter: () =>
          gsap.to(root.querySelectorAll(".contact-display .line > span"), {
            yPercent: 0,
            duration: 1.1,
            stagger: 0.15,
            ease: "power4.out",
          }),
      });
      scopedTriggers.push(ct);

      // -------- Magnetic button --------
      const btn = root.querySelector<HTMLElement>(".magnetic-btn");
      if (btn && !isCoarse) {
        const STRENGTH = 0.3;
        const onMove = (e: MouseEvent) => {
          const r = btn.getBoundingClientRect();
          const x = (e.clientX - r.left - r.width / 2) * STRENGTH;
          const y = (e.clientY - r.top - r.height / 2) * STRENGTH;
          gsap.to(btn, { x, y, duration: 0.3, ease: "power2.out" });
        };
        const onLeave = () =>
          gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
        btn.addEventListener("mousemove", onMove);
        btn.addEventListener("mouseleave", onLeave);
        scopedTriggers.push({
          kill: () => {
            btn.removeEventListener("mousemove", onMove);
            btn.removeEventListener("mouseleave", onLeave);
          },
        });
      }

      ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      stopProgress?.();
      for (const t of scopedTriggers)
        try {
          t?.kill?.();
        } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  // 커스텀 커서(.cursor-dot/.cursor-ring) — entrance 애니메이션(animate)과 분리해서
  // 에디터(animate=false)에서도 동작시킨다. 단 .root(템플릿) 위에 있을 때만 노출해
  // 에디터 사이드 패널 위에선 기본 커서가 유지되게 한다. (배포는 .root 가 전체 화면)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const isCoarse =
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 900;
    if (isCoarse) return;
    const dot = root.querySelector<HTMLElement>(".cursor-dot");
    const ring = root.querySelector<HTMLElement>(".cursor-ring");
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let dx = mx;
    let dy = my;
    let rx = mx;
    let ry = my;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      // 포인터가 .root 위일 때만 커스텀 커서 노출 (그 외엔 기본 커서 사용)
      const overRoot = e.target instanceof Node && root.contains(e.target);
      dot.style.opacity = overRoot ? "1" : "0";
      ring.style.opacity = overRoot ? "1" : "0";
    };
    const tick = () => {
      dx += (mx - dx) * 0.35;
      dy += (my - dy) * 0.35;
      rx += (mx - rx) * 0.08;
      ry += (my - ry) * 0.08;
      dot.style.transform = `translate3d(${dx - 3}px, ${dy - 3}px, 0)`;
      ring.style.transform = `translate3d(${rx - 18}px, ${ry - 18}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove);
    tick();

    const hoverables = root.querySelectorAll<HTMLElement>(
      "a, button, .work-row, .strength-card",
    );
    const onEnter = () => {
      dot.classList.add("is-hover");
      ring.classList.add("is-hover");
    };
    const onLeave = () => {
      dot.classList.remove("is-hover");
      ring.classList.remove("is-hover");
    };
    hoverables.forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      hoverables.forEach((el) => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className={styles.root} style={styleVars} data-density={tokens.density}>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
      />

      {/* 커스텀 커서는 animate 와 무관하게 항상 렌더 — 에디터에서도 보이도록.
          (모바일/터치는 styles.module.css 의 @media 에서 display:none 처리) */}
      <div className="cursor-ring" aria-hidden="true" />
      <div className="cursor-dot" aria-hidden="true" />
      {/* scroll-progress 는 배포(animate)에서만 — 에디터는 자체 스크롤 컨테이너라 window 스크롤 기준이 안 맞음 */}
      {animate && <div className="scroll-progress" aria-hidden="true" />}

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
              const repImage = project.representativeImage as
                | { url?: string; alt?: string }
                | undefined;
              const imageUrl = repImage?.url;
              return (
                <a className="work-row" href={`#work-${i}`} key={i}>
                  <span
                    className={`work-thumb${imageUrl ? "" : " is-empty"}`}
                    aria-hidden={imageUrl ? "true" : undefined}
                  >
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt={repImage?.alt || title} loading="lazy" />
                    ) : (
                      <span className="work-thumb-number">{num}</span>
                    )}
                  </span>
                  <div className="work-info">
                    <span className="work-num">{num}</span>
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

"use client";

import { CSSProperties } from "react";

interface DibutMascotProps {
  /** true면 이메일 필드 포커스 상태 — 눈동자 기본 방향이 왼쪽 아래 */
  isEmailFocused: boolean;
  /** 이메일 입력값 길이 — 포커스 중 타이핑 추적에 사용 */
  emailLength: number;
  /** true면 팔이 올라와 눈을 가림 (비밀번호 필드 포커스 시) */
  isCovering: boolean;
}



const MAX_TRACK = 6; // 타이핑 추적 최대 이동량

export function DibutMascot({ isEmailFocused, emailLength, isCovering }: DibutMascotProps) {
  // 눈동자 방향 계산
  // 이메일 포커스 시: 기본 방향(왼쪽 아래) + 타이핑에 따른 좌우 추적
  const trackX = Math.max(-MAX_TRACK, Math.min(MAX_TRACK, (emailLength - 8) * 0.6));
  const eyeX = isCovering ? 0 : isEmailFocused ? -10 + trackX : 0;
  const eyeY = isCovering ? 0 : isEmailFocused ? 6 : 0;

  const eyeStyle: CSSProperties = {
    transform: `translate(${eyeX}px, ${eyeY}px)`,
    transition: "transform 120ms linear",
    transformBox: "fill-box",
    transformOrigin: "center",
  };

  // 팔 스타일 계산
  const armLeftStyle: CSSProperties = {
    transform: isCovering
      ? "translate(-160px, -160px) rotate(-103deg)"
      : "translate(0, 0) rotate(0deg)",
    transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
    transformBox: "fill-box",
    transformOrigin: "70% 8%",
  };

  const armRightStyle: CSSProperties = {
    transform: isCovering
      ? "translate(160px, -160px) rotate(103deg)"
      : "translate(0, 0) rotate(0deg)",
    transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
    transformBox: "fill-box",
    transformOrigin: "30% 8%",
  };

  return (
    <div className="flex justify-center mt-8 mb-4">
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#FFCC80",
          // border: "3px solid #FFA726",
          // boxShadow: "0 6px 20px rgba(255, 167, 38, 0.35)",
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 -20 569 640"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          aria-label="디벗 마스코트"
        >
          {/* 발  */}
          <image href="/mascot/feet.svg" x="36" y="719" width="496" height="92" />
          {/* 몸통 */}
          <image href="/mascot/body.svg" x="0" y="0" width="569" height="749" />
          {/* 귀 */}
          <image href="/mascot/ear-left.svg" x="102" y="39" width="76" height="80" />
          <image href="/mascot/ear-right.svg" x="391" y="39" width="76" height="80" />
          {/* 배 디테일 */}
          <image href="/mascot/belly.svg" x="202" y="358" width="159" height="44" />

          {/* 눈 (인터랙티브) */}
          <g style={eyeStyle}>
            <image href="/mascot/eye-left.svg" x="164" y="124" width="41" height="41" />
          </g>
          <g style={eyeStyle}>
            <image href="/mascot/eye-right.svg" x="361" y="124" width="41" height="41" />
          </g>

          {/* 입 */}
          <image href="/mascot/mouth.svg" x="161" y="166" width="245" height="172" />
          {/* 하체 */}
          <image href="/mascot/lower-body.svg" x="107" y="635" width="349" height="107" />
          {/* 안경 */}
          <image href="/mascot/glasses.svg" x="91.5" y="75" width="387" height="134" />

          {/* 팔 (인터랙티브) */}
          <g style={armLeftStyle}>
            <image href="/mascot/arm-left.svg" x="20" y="360" width="234" height="241" />
          </g>
          <g style={armRightStyle}>
            <image href="/mascot/arm-right.svg" x="316" y="360" width="234" height="241" />
          </g>
        </svg>
      </div>
    </div>
  );
}

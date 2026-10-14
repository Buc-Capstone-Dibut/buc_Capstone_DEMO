"use client";

import { CSSProperties } from "react";

interface DebutMascotProps {
  /** true면 이메일 필드 포커스 상태 — 눈동자 기본 방향이 왼쪽 아래 */
  isEmailFocused: boolean;
  /** 이메일 입력값 길이 — 포커스 중 타이핑 추적에 사용 */
  emailLength: number;
  /** true면 팔이 올라와 눈을 가림 (비밀번호 필드 포커스 시) */
  isCovering: boolean;
}



const MAX_TRACK = 6; // 타이핑 추적 최대 이동량

export function DebutMascot({ isEmailFocused, emailLength, isCovering }: DebutMascotProps) {
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
      ? "translate(-187px, -118px) rotate(-113deg)"
      : "translate(0, 0) rotate(0deg)",
    transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
    transformBox: "fill-box",
    transformOrigin: "70% 8%",
  };

  const armRightStyle: CSSProperties = {
    transform: isCovering
      ? "translate(196px, -118px) rotate(113deg)"
      : "translate(0, 0) rotate(0deg)",
    transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
    transformBox: "fill-box",
    transformOrigin: "30% 8%",
  };

  const svgFrame = {
    viewBox: "-6.1 -26.86 581.19 653.71",
    width: "100%",
    height: "100%",
    preserveAspectRatio: "xMidYMid meet" as const,
  };

  return (
    <div className="flex justify-center mt-8 mb-4">
      <div
        style={{
          width: 143,
          height: 143,
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            overflow: "hidden",
            background: "#FCD9B1",
          }}
        >
          <svg {...svgFrame} aria-label="디벗 마스코트">
            {/* 귀 */}
            <image href="/mascot/ear-left.svg" x="70" y="70" width="116.48" height="119" />
            <image href="/mascot/ear-right.svg" x="380" y="65" width="104" height="109" />
            {/* 몸통 */}
            <image href="/mascot/body.svg" x="33" y="15" width="503" height="654" />
            {/* 배 디테일 */}
            <image href="/mascot/belly.svg" x="210" y="428" width="150" height="30.39" />

            {/* 눈 (인터랙티브) */}
            <g style={eyeStyle}>
              <image href="/mascot/eye-left.svg" x="167" y="187" width="36" height="43" />
            </g>
            <g style={eyeStyle}>
              <image href="/mascot/eye-right.svg" x="373" y="187" width="36" height="43" />
            </g>

            {/* 입 */}
            <image href="/mascot/mouth.svg" x="175" y="215" width="219.2" height="185.71" />
          </svg>
        </div>

        {/* 팔이 원 밖으로 나가도 손가락이 잘리지 않게 별도 레이어 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            overflow: isCovering ? "visible" : "hidden",
            pointerEvents: "none",
          }}
        >
          <svg
            {...svgFrame}
            aria-hidden
            style={{ overflow: isCovering ? "visible" : "hidden" }}
          >
            <g style={armLeftStyle}>
              <image href="/mascot/arm-left.svg" x="45.03" y="404.99" width="246.93" height="242.95" />
            </g>
            <g style={armRightStyle}>
              <image href="/mascot/arm-right.svg" x="270.03" y="404.99" width="246.93" height="242.95" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

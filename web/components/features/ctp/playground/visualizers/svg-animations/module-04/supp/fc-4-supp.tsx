"use client";

import {
  CyberGrid,
  NeonGlowFilters,
  ArrayBox,
  colorTokens,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Supp 1: 문제 정독 체크리스트
function Fc4Supp1() {
  const W = 600;
  const H = 300;
  const items = [
    { label: "입력 범위 (N 최대?)", example: "1 ≤ N ≤ 10^5" },
    { label: "출력 형식 (정렬?)", example: "정렬된 인덱스 리스트" },
    { label: "제한 시간 / 메모리", example: "2초 / 256MB" },
    { label: "엣지 케이스", example: "빈 입력, 중복, 음수" },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={26} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        문제 정독 체크리스트
      </text>
      <text x={W / 2} y={48} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        잘못 읽고 코딩하는 사고를 가장 큰 비율로 줄임
      </text>

      {items.map((it, i) => {
        const y = 80 + i * 44;
        return (
          <g key={i}>
            {/* checkbox */}
            <rect x={50} y={y} width={20} height={20} fill="hsl(var(--background))" stroke={colorTokens.active} strokeWidth={2} rx={3} />
            <path d={`M 54 ${y + 11} L 60 ${y + 16} L 68 ${y + 6}`} stroke={colorTokens.found} strokeWidth={2.5} fill="none" />
            {/* label */}
            <text x={84} y={y + 14} fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">
              {it.label}
            </text>
            {/* example */}
            <text x={310} y={y + 14} fontSize={11} fontStyle="italic" fill="hsl(var(--muted-foreground))">
              예: {it.example}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Supp 2: 전략 후보 비교표
function Fc4Supp2() {
  const W = 600;
  const H = 300;
  const tableX = 60;
  const tableY = 70;
  const colW = 120;
  const rowH = 42;

  const headers = ["풀이", "시간복잡도", "공간복잡도", "구현 난이도"];
  const rows = [
    { name: "Nested Loop", time: "O(N²)", space: "O(1)", diff: "쉬움" },
    { name: "Hash Map", time: "O(N)", space: "O(N)", diff: "보통", best: true },
    { name: "Sort + Two-pointer", time: "O(N log N)", space: "O(N)", diff: "보통" },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={26} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        전략 후보 비교표
      </text>

      {/* header row */}
      <rect x={tableX} y={tableY} width={colW * 4} height={rowH} fill="hsl(var(--muted))" rx={6} />
      {headers.map((h, i) => (
        <text key={i} x={tableX + colW * i + colW / 2} y={tableY + rowH / 2 + 5} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
          {h}
        </text>
      ))}

      {rows.map((r, i) => {
        const y = tableY + (i + 1) * rowH;
        const cells = [r.name, r.time, r.space, r.diff];
        return (
          <g key={i}>
            <rect
              x={tableX}
              y={y}
              width={colW * 4}
              height={rowH}
              fill={r.best ? "hsl(var(--muted))" : "hsl(var(--background))"}
              stroke={r.best ? colorTokens.found : "hsl(var(--border))"}
              strokeWidth={r.best ? 2 : 1}
              rx={4}
            />
            {cells.map((c, ci) => (
              <text
                key={ci}
                x={tableX + colW * ci + colW / 2}
                y={y + rowH / 2 + 5}
                textAnchor="middle"
                fontSize={11}
                fontWeight={r.best ? 700 : 400}
                fill={r.best && ci === 1 ? colorTokens.found : "hsl(var(--foreground))"}
              >
                {c}
              </text>
            ))}
            {r.best && (
              <text x={tableX - 16} y={y + rowH / 2 + 5} textAnchor="middle" fontSize={14} fill={colorTokens.found} fontWeight={700}>
                ★
              </text>
            )}
          </g>
        );
      })}

      <text x={W / 2} y={H - 16} textAnchor="middle" fontSize={11} fontStyle="italic" fill="hsl(var(--muted-foreground))">
        "가능한 풀이"가 아닌 "제한 시간 안에 안전한 풀이"를 선택.
      </text>
    </svg>
  );
}

// Supp 3: 구현 전 설계 메모 (포스트잇 스타일)
function Fc4Supp3() {
  const W = 600;
  const H = 300;
  const notes = [
    { title: "자료구조", body: "Hash Map<int, int>\n(값 → 인덱스)" },
    { title: "핵심 변수", body: "seen = {}\nresult = []" },
    { title: "종료 조건", body: "배열 끝 도달\n또는 모든 쌍 발견" },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={26} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        구현 전 설계 메모
      </text>
      <text x={W / 2} y={48} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        글로 적으면 누락이 사라진다.
      </text>

      {notes.map((n, i) => {
        const w = 160;
        const h = 160;
        const x = 30 + i * 190;
        const y = 80;
        return (
          <g key={i} transform={`rotate(${i === 1 ? 0 : i === 0 ? -3 : 3}, ${x + w / 2}, ${y + h / 2})`}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={colorTokens.comparing}
              stroke="hsl(var(--border))"
              strokeWidth={1.5}
              rx={6}
            />
            <rect x={x} y={y} width={w} height={28} fill="hsl(var(--muted))" rx={6} />
            <text x={x + w / 2} y={y + 19} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
              {n.title}
            </text>
            {n.body.split("\n").map((ln, li) => (
              <text key={li} x={x + 12} y={y + 60 + li * 22} fontSize={11} fill="hsl(var(--background))" fontFamily="ui-monospace, monospace">
                {ln}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// Supp 4: 엣지 케이스 점검 표
function Fc4Supp4() {
  const W = 600;
  const H = 300;
  const tableX = 50;
  const tableY = 70;
  const colW = 165;
  const rowH = 42;
  const rows = [
    { case_: "빈 입력 []", expected: "[]", actual: "[]", ok: true },
    { case_: "중복 [3,3,6]", expected: "[[0,1]]", actual: "[[0,1]]", ok: true },
    { case_: "음수 [-2,11]", expected: "[[0,1]]", actual: "[[0,1]]", ok: true },
    { case_: "정답 없음", expected: "[]", actual: "[]", ok: true },
  ];
  const headers = ["케이스", "예상", "실제", "결과"];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={26} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        엣지 케이스 최종 점검
      </text>

      {/* header */}
      <rect x={tableX} y={tableY} width={colW * 3 + 60} height={rowH} fill="hsl(var(--muted))" rx={6} />
      {headers.map((h, i) => {
        const x = i === 3 ? tableX + colW * 3 + 30 : tableX + colW * i + colW / 2;
        return (
          <text key={i} x={x} y={tableY + rowH / 2 + 5} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
            {h}
          </text>
        );
      })}

      {rows.map((r, i) => {
        const y = tableY + (i + 1) * rowH;
        return (
          <g key={i}>
            <rect x={tableX} y={y} width={colW * 3 + 60} height={rowH} fill="hsl(var(--background))" stroke="hsl(var(--border))" rx={4} />
            <text x={tableX + colW / 2} y={y + rowH / 2 + 5} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))">{r.case_}</text>
            <text x={tableX + colW + colW / 2} y={y + rowH / 2 + 5} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontFamily="ui-monospace, monospace">{r.expected}</text>
            <text x={tableX + colW * 2 + colW / 2} y={y + rowH / 2 + 5} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontFamily="ui-monospace, monospace">{r.actual}</text>
            {/* ok mark */}
            <g transform={`translate(${tableX + colW * 3 + 30}, ${y + rowH / 2})`}>
              <circle cx={0} cy={0} r={11} fill={r.ok ? colorTokens.found : colorTokens.comparing} />
              <path d="M -5 0 L -1 5 L 6 -4" stroke="hsl(var(--background))" strokeWidth={2} fill="none" />
            </g>
          </g>
        );
      })}

      <text x={W / 2} y={H - 14} textAnchor="middle" fontSize={11} fontStyle="italic" fill="hsl(var(--muted-foreground))">
        제출 직전 1분 투자로 점수 손실 최소화.
      </text>
    </svg>
  );
}

export const Fc4SupplementaryOptions = [Fc4Supp1, Fc4Supp2, Fc4Supp3, Fc4Supp4];

"use client";

import React from "react";
import { motion } from "framer-motion";

// 1. 완전 이진 트리 (Complete Binary Tree) SVG
export function CompleteBinaryTreeSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-heap-1" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-heap-1)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">완전 이진 트리와 배열</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">트리의 노드들을 레벨 순서대로 배열에 빈틈없이 매핑합니다.</text>

      <g transform="translate(100, 100)">
        {/* Edges */}
        <polyline points="200,20 100,80" fill="none" stroke="#94a3b8" strokeWidth="2" />
        <polyline points="200,20 300,80" fill="none" stroke="#94a3b8" strokeWidth="2" />
        <polyline points="100,80 50,140" fill="none" stroke="#94a3b8" strokeWidth="2" />
        <polyline points="100,80 150,140" fill="none" stroke="#94a3b8" strokeWidth="2" />
        <polyline points="300,80 250,140" fill="none" stroke="#94a3b8" strokeWidth="2" />

        {/* Nodes */}
        <g transform="translate(200, 20)">
          <circle r="20" fill="#3b82f6" />
          <text fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" dy="5">0</text>
        </g>
        <g transform="translate(100, 80)">
          <circle r="20" fill="#10b981" />
          <text fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" dy="5">1</text>
        </g>
        <g transform="translate(300, 80)">
          <circle r="20" fill="#10b981" />
          <text fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" dy="5">2</text>
        </g>
        <g transform="translate(50, 140)">
          <circle r="20" fill="#8b5cf6" />
          <text fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" dy="5">3</text>
        </g>
        <g transform="translate(150, 140)">
          <circle r="20" fill="#8b5cf6" />
          <text fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" dy="5">4</text>
        </g>
        <g transform="translate(250, 140)">
          <circle r="20" fill="#8b5cf6" />
          <text fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" dy="5">5</text>
        </g>
      </g>

      <g transform="translate(450, 80)">
        <text x="30" y="-10" className="fill-slate-600 dark:fill-slate-400" fontSize="14" fontWeight="bold" textAnchor="middle">배열 인덱스</text>
        <rect x="0" y="0" width="40" height="30" fill="#3b82f6" rx="4" />
        <text x="20" y="20" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">0</text>

        <rect x="0" y="32" width="40" height="30" fill="#10b981" rx="4" />
        <text x="20" y="52" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">1</text>

        <rect x="0" y="64" width="40" height="30" fill="#10b981" rx="4" />
        <text x="20" y="84" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">2</text>

        <rect x="0" y="96" width="40" height="30" fill="#8b5cf6" rx="4" />
        <text x="20" y="116" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">3</text>

        <rect x="0" y="128" width="40" height="30" fill="#8b5cf6" rx="4" />
        <text x="20" y="148" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">4</text>

        <rect x="0" y="160" width="40" height="30" fill="#8b5cf6" rx="4" />
        <text x="20" y="180" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">5</text>
      </g>
    </svg>
  );
}

// 2. 최대 힙 속성 (Max Heap Property) SVG
export function MaxHeapPropertySVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-heap-2" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-heap-2)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">최대 힙 (Max Heap)</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">부모 노드의 값이 자식 노드의 값보다 항상 크거나 같은 상태입니다.</text>

      <g transform="translate(150, 120)">
        <polyline points="150,20 50,80" fill="none" stroke="#94a3b8" strokeWidth="2" />
        <polyline points="150,20 250,80" fill="none" stroke="#94a3b8" strokeWidth="2" />

        <g transform="translate(150, 20)">
          <circle r="30" fill="#f43f5e" />
          <text fill="white" fontSize="20" fontWeight="bold" textAnchor="middle" dy="7">99</text>
          <text y="-40" className="fill-slate-600 dark:fill-slate-400" fontSize="14" fontWeight="bold" textAnchor="middle">부모 (최댓값)</text>
        </g>

        <g transform="translate(50, 80)">
          <circle r="25" fill="#3b82f6" />
          <text fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" dy="5">50</text>
        </g>

        <g transform="translate(250, 80)">
          <circle r="25" fill="#3b82f6" />
          <text fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" dy="5">75</text>
        </g>
      </g>

      <g transform="translate(450, 150)">
         <text x="0" y="-30" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">힙 속성</text>
         <text x="0" y="0" className="fill-slate-600 dark:fill-slate-400" fontSize="14" textAnchor="middle">부모 ≥ 자식</text>
         <text x="0" y="30" className="fill-slate-600 dark:fill-slate-400" fontSize="14" textAnchor="middle">최상단 트리 루트 =</text>
         <text x="0" y="55" className="fill-slate-600 dark:fill-slate-400" fontSize="14" textAnchor="middle">전체 최댓값 (O(1))</text>
      </g>
    </svg>
  );
}

// 3. 힙 구조화 (Heapify) SVG
export function HeapifySVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-heap-3" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-heap-3)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">힙 구조화 (Heapify)</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">자식과 비교하며 노드를 아래로 내려보내 힙 속성을 복원합니다.</text>

      <g transform="translate(220, 100)">
        <polyline points="0,0 -80,60" fill="none" stroke="#94a3b8" strokeWidth="2" />
        <polyline points="0,0 80,60" fill="none" stroke="#94a3b8" strokeWidth="2" />

        {/* Animated Root */}
        <motion.g
          initial={{ y: 0, x: 0 }}
          animate={{ y: [0, 60], x: [0, -80] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", repeatDelay: 1 }}
        >
          <circle r="25" fill="#f43f5e" />
          <text fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" dy="5">10</text>
        </motion.g>

        {/* Animated Left Child */}
        <motion.g
           initial={{ y: 60, x: -80 }}
           animate={{ y: [60, 0], x: [-80, 0] }}
           transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", repeatDelay: 1 }}
        >
          <circle r="25" fill="#10b981" />
          <text fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" dy="5">99</text>
        </motion.g>

        <g transform="translate(80, 60)">
          <circle r="25" fill="#3b82f6" />
          <text fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" dy="5">20</text>
        </g>
      </g>

      <g transform="translate(450, 150)">
         <text x="0" y="0" className="fill-slate-600 dark:fill-slate-400" fontSize="14" textAnchor="middle">10 &lt; 99 비교 후 교환</text>
      </g>
    </svg>
  );
}

// 4. 정렬 과정 (Heap Sort Process) SVG
export function HeapSortProcessSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-heap-4" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-heap-4)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">힙 정렬의 반복 과정</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">최댓값(루트)을 끝으로 보내고 힙 크기를 1 줄인 뒤 힙을 복원합니다.</text>

      <g transform="translate(100, 130)">
        {/* Array representation */}
        <rect x="0" y="0" width="250" height="40" fill="none" stroke="#94a3b8" strokeWidth="2" rx="4" />
        <rect x="0" y="0" width="50" height="40" fill="#f43f5e" rx="4" />
        <text x="25" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">99</text>

        <rect x="50" y="0" width="50" height="40" fill="none" stroke="#94a3b8" />
        <text x="75" y="25" className="fill-slate-600 dark:fill-slate-400" fontSize="16" fontWeight="bold" textAnchor="middle">...</text>

        <rect x="150" y="0" width="50" height="40" fill="none" stroke="#94a3b8" />
        <text x="175" y="25" className="fill-slate-600 dark:fill-slate-400" fontSize="16" fontWeight="bold" textAnchor="middle">...</text>

        <rect x="200" y="0" width="50" height="40" fill="#3b82f6" rx="4" />
        <text x="225" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">10</text>
      </g>

      <motion.path
        d="M 125 125 Q 175 70, 225 125"
        fill="none"
        stroke="#10b981"
        strokeWidth="3"
        strokeDasharray="5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatType: "loop", repeatDelay: 1 }}
      />
      <motion.path
        d="M 325 125 Q 275 70, 225 125"
        fill="none"
        stroke="#10b981"
        strokeWidth="3"
        strokeDasharray="5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatType: "loop", repeatDelay: 1 }}
        transform="translate(-100, 0) scale(-1, 1) translate(-350, 0)" // Flip horizontal
      />

       <g transform="translate(450, 150)">
         <text x="0" y="-30" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">1. 루트 ↔ 마지막 교환</text>
         <text x="0" y="0" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">2. 마지막 노드 고정</text>
         <text x="0" y="30" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">3. 힙 크기 축소</text>
         <text x="0" y="60" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">4. 새 루트 Heapify</text>
       </g>
    </svg>
  );
}

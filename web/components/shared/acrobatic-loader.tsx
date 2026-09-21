'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOADING_MESSAGES = [
  "커리어 데이터를 연결하는 중...",
  "실시간 협업 공간을 준비하고 있어요...",
  "Dibut 워크스페이스 로딩 중...",
  "개발자 스쿼드를 매칭하고 있습니다...",
  "조금만 기다려주세요! ✨"
];

export default function AcrobaticLoader() {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="relative flex flex-col items-center justify-center">
        {/* Acrobatic Preloader SVG */}
        <svg 
          className="ap" 
          viewBox="0 0 128 256" 
          width="96px" 
          height="192px" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ap-grad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3c3fde" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="ap-grad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#e40666" />
            </linearGradient>
          </defs>
          
          <circle 
            className="ap__worm1" 
            r="56" 
            cx="64" 
            cy="192" 
            fill="none" 
            stroke="url(#ap-grad1)" 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeDasharray="87.96 263.89" 
          />
          
          <path 
            className="ap__worm2" 
            d="M120,192A56,56,0,0,1,8,192C8,161.07,16,8,64,8S120,161.07,120,192Z" 
            fill="none" 
            stroke="url(#ap-grad2)" 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeDasharray="87.96 494" 
          />
        </svg>

        {/* Smooth switching text under the loader */}
        <div className="mt-8 h-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={textIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="text-sm font-semibold text-muted-foreground tracking-wide"
            >
              {LOADING_MESSAGES[textIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <style jsx global>{`
        .ap {
          display: block;
          margin: auto;
        }

        .ap__worm1,
        .ap__worm2 {
          animation-duration: 3s;
          animation-iteration-count: infinite;
        }

        .ap__worm1 {
          animation-name: worm1;
        }

        .ap__worm2 {
          animation-name: worm2;
          visibility: hidden;
        }

        @keyframes worm1 {
          from {
            animation-timing-function: ease-in-out;
            stroke-dashoffset: -87.96;
          }
          20% {
            animation-timing-function: ease-in;
            stroke-dashoffset: 0;
          }
          60% {
            stroke-dashoffset: -791.68;
            visibility: visible;
          }
          60.1%, to {
            stroke-dashoffset: -791.68;
            visibility: hidden;
          }
        }

        @keyframes worm2 {
          from, 60% {
            stroke-dashoffset: -87.96;
            visibility: hidden;
          }
          60.1% {
            animation-timing-function: cubic-bezier(0, 0, 0.5, 0.75);
            stroke-dashoffset: -87.96;
            visibility: visible;
          }
          77% {
            animation-timing-function: cubic-bezier(0.5, 0.25, 0.5, 0.88);
            stroke-dashoffset: -340;
            visibility: visible;
          }
          to {
            stroke-dashoffset: -669.92;
            visibility: visible;
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpotlightBgProps {
  className?: string;
  fill?: string;
}

export function SpotlightBg({ className, fill = "white" }: SpotlightBgProps) {
  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.8, ease: "easeOut" }}
      className={cn(
        "pointer-events-none absolute z-[1] h-[169%] w-[138%] lg:w-[84%]",
        className,
      )}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
    >
      <g filter="url(#spotlight-filter)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill}
          fillOpacity="0.21"
        />
      </g>
      <defs>
        <filter
          id="spotlight-filter"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur" />
        </filter>
      </defs>
    </motion.svg>
  );
}

interface CursorSpotlightProps {
  className?: string;
  size?: number;
}

export function CursorSpotlight({ className, size = 600 }: CursorSpotlightProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const onMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      el.style.setProperty("--x", `${e.clientX - rect.left}px`);
      el.style.setProperty("--y", `${e.clientY - rect.top}px`);
    };
    parent.addEventListener("mousemove", onMove);
    return () => parent.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 z-0", className)}
      style={{
        background: `radial-gradient(${size}px circle at var(--x, 50%) var(--y, 50%), hsl(var(--primary) / 0.18), transparent 60%)`,
      }}
    />
  );
}

export function GridPattern({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0",
        "[background-image:linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)]",
        "[background-size:48px_48px]",
        "[mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]",
        className,
      )}
    />
  );
}

export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2 }}
        className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px]"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, delay: 0.3 }}
        className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-blue-400/20 blur-[120px]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 3, delay: 0.5 }}
        className="absolute top-1/2 left-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-400/10 blur-[150px]"
      />
    </div>
  );
}

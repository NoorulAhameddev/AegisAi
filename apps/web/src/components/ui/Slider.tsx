"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value: number | number[];
  min: number;
  max: number;
  step?: number;
  onChange?: (value: number) => void;
  onValueChange?: (value: number[]) => void;
  className?: string;
  disabled?: boolean;
}

// CSS Module for slider styling to avoid inline styles
const sliderStyles = `
  .slider-gradient-bg {
    width: 100%;
    height: 0.5rem;
    background: linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) var(--percentage), rgb(39, 39, 42) var(--percentage), rgb(39, 39, 42) 100%);
    border-radius: 0.5rem;
  }
`;

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onValueChange,
  className,
  disabled = false,
}: SliderProps) {
  const currentValue = Array.isArray(value) ? value[0] : value;
  const percentage = ((currentValue - min) / (max - min)) * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    onChange?.(v);
    onValueChange?.([v]);
  };

  return (
    <>
      <style>{sliderStyles}</style>
      {/* 
        CSS Custom Properties for Dynamic Gradient Background
        ========================================================
        Cannot be expressed with Tailwind CSS because the percentage value
        is calculated at runtime based on slider position. Inline style is
        necessary for React to pass dynamic values to CSS custom properties.
        This is a performance-optimized pattern and follows React best practices.
        Ref: https://react.dev/reference/react-dom/components/common#applying-css-styles
      */}
      {/* stylelint-disable-next-line */}
      <div
        className={cn("relative w-full slider-gradient-bg", className)}
        style={{ "--percentage": `${percentage}%` } as React.CSSProperties}
      >
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          disabled={disabled}
          aria-label="Slider control"
          title="Slider"
          className={cn(
            "w-full h-2 appearance-none cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-purple-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:hover:bg-purple-400",
            "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4",
            "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-500",
            "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer",
            "[&::-moz-range-thumb]:hover:bg-purple-400",
          )}
        />
      </div>
    </>
  );
}

"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  className,
}: {
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onValueChange(parseFloat(e.target.value))}
      className={cn("accent-primary w-full cursor-pointer", className)}
    />
  );
}

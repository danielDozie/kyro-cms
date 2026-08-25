import React from "react";
import * as Icons from "lucide-react";
import * as HeroOutline from "@heroicons/react/24/outline";
import * as HeroSolid from "@heroicons/react/24/solid";

export interface DynamicIconProps {
  name?: string | null | React.ComponentType<any>;
  className?: string;
  strokeWidth?: number;
  size?: number;
  fallback?: React.ComponentType<{ className?: string }>;
}

const toPascalCase = (str: string) =>
  str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^(\w)/, (_, c) => c.toUpperCase());

export function DynamicIcon({
  name,
  className = "w-4 h-4",
  strokeWidth = 2,
  size,
  fallback: Fallback = Icons.Dot,
}: DynamicIconProps) {
  if (!name) {
    return <Fallback className={className} />;
  }

  // If already a React component / function, render it directly
  if (typeof name === "function" || (typeof name === "object" && name !== null)) {
    const Component = name as React.ComponentType<any>;
    return <Component className={className} strokeWidth={strokeWidth} size={size} />;
  }

  const iconName = String(name).trim();

  // 1. Explicit Lucide namespace (e.g. "lucide:Utensils", "lucide:shopping-bag")
  if (iconName.startsWith("lucide:")) {
    const clean = iconName.replace("lucide:", "");
    const pascal = toPascalCase(clean);
    const Comp = (Icons as any)[clean] || (Icons as any)[pascal];
    if (Comp) return <Comp className={className} strokeWidth={strokeWidth} size={size} />;
  }

  // 2. Explicit Heroicons Outline namespace (e.g. "hero:Sparkles", "hero-outline:fire")
  if (iconName.startsWith("hero:") || iconName.startsWith("hero-outline:")) {
    const clean = iconName.replace(/^hero(-outline)?:/, "");
    const pascal = toPascalCase(clean);
    const Comp =
      (HeroOutline as any)[clean] ||
      (HeroOutline as any)[pascal] ||
      (HeroOutline as any)[`${pascal}Icon`];
    if (Comp) return <Comp className={className} strokeWidth={strokeWidth} />;
  }

  // 3. Explicit Heroicons Solid namespace (e.g. "hero-solid:Fire")
  if (iconName.startsWith("hero-solid:")) {
    const clean = iconName.replace("hero-solid:", "");
    const pascal = toPascalCase(clean);
    const Comp =
      (HeroSolid as any)[clean] ||
      (HeroSolid as any)[pascal] ||
      (HeroSolid as any)[`${pascal}Icon`];
    if (Comp) return <Comp className={className} />;
  }

  // 4. Direct Lucide icon check
  const pascal = toPascalCase(iconName);
  const LucideComp = (Icons as any)[iconName] || (Icons as any)[pascal];
  if (LucideComp) return <LucideComp className={className} strokeWidth={strokeWidth} size={size} />;

  // 5. Direct Heroicon check (e.g. SparklesIcon, ShoppingBagIcon, or Sparkles)
  const HeroDirect =
    (HeroOutline as any)[iconName] ||
    (HeroOutline as any)[pascal] ||
    (HeroOutline as any)[`${pascal}Icon`];
  if (HeroDirect) return <HeroDirect className={className} strokeWidth={strokeWidth} />;

  return <Fallback className={className} />;
}

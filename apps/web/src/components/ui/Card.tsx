import { cn } from "@/lib/utils";
import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
}

export function Card({
  children,
  className,
  hover = false,
  glow = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-zinc-900/40 border border-white/5 p-6 backdrop-blur-xl",
        "transition-all duration-300",
        hover &&
          "hover:bg-zinc-800/60 hover:border-white/10 hover:-translate-y-1 cursor-pointer",
        glow && "hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-xl font-bold text-white", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-zinc-400 text-sm mt-1", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-4 pt-4 border-t border-white/5", className)}
      {...props}
    >
      {children}
    </div>
  );
}

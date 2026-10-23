import React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: number;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 32,
  className,
  style,
  ...props
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-ink-800 text-ink-100 font-medium",
        className,
      )}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <span className="text-xs">{getInitials(name)}</span>
    </div>
  );
};

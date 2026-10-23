"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

export const Popover: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
};

export const PopoverTrigger: React.FC<{
  children: React.ReactNode;
  asChild?: boolean;
}> = ({ children, asChild = false }) => {
  const ctx = useContext(PopoverContext);
  if (!ctx) return <>{children}</>;
  type ClickableProps = { onClick?: (e: React.MouseEvent) => void };
  const child = React.Children.only(
    children,
  ) as React.ReactElement<ClickableProps>;
  if (!React.isValidElement<ClickableProps>(child)) return null;
  const onClick = (e: React.MouseEvent) => {
    child.props.onClick?.(e);
    ctx.setOpen(!ctx.open);
  };
  if (asChild) {
    return React.cloneElement(child, { onClick });
  }
  return (
    <button onClick={onClick} type="button">
      {children}
    </button>
  );
};

export const PopoverContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  const ctx = useContext(PopoverContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctx?.open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        ctx.setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ctx]);

  if (!ctx?.open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute right-0 mt-2 bg-ink-900 border border-ink-700 z-50",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

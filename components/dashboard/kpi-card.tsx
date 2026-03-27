import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: number;
  className?: string;
  valueClassName?: string;
}

export function KpiCard({ title, value, subtitle, icon, trend, className, valueClassName }: KpiCardProps) {
  return (
    <div className={cn("bg-[#12121a] border border-white/7 rounded-xl p-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/50 font-medium uppercase tracking-wider">{title}</span>
        {icon && <div className="text-white/30">{icon}</div>}
      </div>
      <div className={cn("font-dm-mono text-2xl font-bold text-white", valueClassName)}>
        {value}
      </div>
      {subtitle && <div className="text-xs text-white/40 mt-1">{subtitle}</div>}
      {typeof trend === "number" && (
        <div className={cn("text-xs mt-1", trend >= 0 ? "text-green-400" : "text-red-400")}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

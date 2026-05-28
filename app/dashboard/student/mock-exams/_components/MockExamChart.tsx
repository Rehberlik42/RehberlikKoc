"use client";

import { LineChart as LineChartIcon, TrendingUp } from "lucide-react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChartPoint {
  id: number;
  date: string;
  fullDate: string;
  examName: string;
  title: string;
  net: number;
}

interface Props {
  data: ChartPoint[];
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
interface TooltipPayloadItem {
  payload?: ChartPoint;
}

interface NeonTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function NeonTooltip({ active, payload }: NeonTooltipProps) {
  if (!active || !payload || payload.length === 0 || !payload[0].payload) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl bg-[#07071a]/95 backdrop-blur-md border border-[#7B2FFF]/40 shadow-2xl shadow-[#7B2FFF]/20 px-4 py-3 min-w-[180px]">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#A78BFF] mb-1.5">
        {point.examName} · {new Date(point.fullDate).toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
      </div>
      <div className="text-white text-sm font-semibold mb-2 truncate">
        {point.title}
      </div>
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/8">
        <span className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">
          Toplam Net
        </span>
        <span
          className={`text-lg font-black tabular-nums ${
            point.net >= 0 ? "text-white" : "text-red-400"
          }`}
          style={{
            textShadow:
              point.net >= 0
                ? "0 0 12px rgba(123,47,255,0.7)"
                : "0 0 12px rgba(239,68,68,0.5)",
          }}
        >
          {point.net >= 0 ? "+" : ""}
          {point.net.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="h-full min-h-[320px] rounded-xl border border-white/8 border-dashed bg-white/2 flex flex-col items-center justify-center text-center px-6 py-12">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7B2FFF]/20 to-[#4F7CFF]/15 border border-[#7B2FFF]/25 flex items-center justify-center mb-3">
        <LineChartIcon className="w-5 h-5 text-[#A78BFF]" />
      </div>
      <p className="text-white/60 text-sm font-semibold mb-1">
        Henüz deneme verisi yok
      </p>
      <p className="text-white/30 text-xs max-w-xs">
        İlk denemeni kaydettiğinde net grafiklerin burada şık bir şekilde görünecek.
      </p>
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────
export default function MockExamChart({ data }: Props) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-md overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F7CFF]/30 to-[#00D4FF]/20 border border-[#4F7CFF]/20 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-[#7AB3FF]" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-sm">Net Gelişim Grafiği</h3>
          <p className="text-white/30 text-[11px]">
            Zaman içindeki toplam net değişimi
          </p>
        </div>
        {data.length > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2 py-1 rounded-md bg-white/4 border border-white/8">
            {data.length} deneme
          </span>
        )}
      </div>

      <div className="p-5 flex-1 min-h-[360px]">
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={data}
              margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
            >
              <defs>
                <linearGradient id="netGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7B2FFF" />
                  <stop offset="50%" stopColor="#4F7CFF" />
                  <stop offset="100%" stopColor="#00D4FF" />
                </linearGradient>
                <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7B2FFF" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7B2FFF" stopOpacity={0} />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="3 6"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                dy={6}
              />

              <YAxis
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                width={42}
              />

              <Tooltip
                content={<NeonTooltip />}
                cursor={{
                  stroke: "rgba(123,47,255,0.4)",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />

              <Area
                type="monotone"
                dataKey="net"
                stroke="none"
                fill="url(#netFill)"
                isAnimationActive
              />

              <Line
                type="monotone"
                dataKey="net"
                stroke="url(#netGradient)"
                strokeWidth={2.5}
                filter="url(#glow)"
                dot={{
                  r: 4,
                  fill: "#0d0d2b",
                  stroke: "#7B2FFF",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: "#7B2FFF",
                  stroke: "#A78BFF",
                  strokeWidth: 2,
                }}
                isAnimationActive
                animationDuration={600}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
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
  ReferenceLine,
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
    <div className="min-w-[180px] rounded-xl border border-[#7B2FFF]/40 bg-[#07071a]/95 px-4 py-3 shadow-2xl shadow-[#7B2FFF]/20 backdrop-blur-md">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#A78BFF]">
        {point.examName} ·{" "}
        {new Date(point.fullDate).toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
      </div>
      <div className="mb-2 truncate text-sm font-semibold text-white">
        {point.title}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
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
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-white/8 bg-white/[0.02] px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#7B2FFF]/25 bg-gradient-to-br from-[#7B2FFF]/20 to-[#4F7CFF]/15">
        <LineChartIcon className="h-5 w-5 text-[#A78BFF]" />
      </div>
      <p className="mb-1 text-sm font-semibold text-white/60">
        Henüz deneme verisi yok
      </p>
      <p className="max-w-xs text-xs text-white/30">
        İlk denemeni kaydettiğinde net grafiklerin burada şık bir şekilde görünecek.
      </p>
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────
export default function MockExamChart({ data }: Props) {
  const avgNet = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.net, 0) / data.length;
  }, [data]);

  const lastIndex = data.length - 1;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-md">
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#4F7CFF]/20 bg-gradient-to-br from-[#4F7CFF]/30 to-[#00D4FF]/20">
          <TrendingUp className="h-4 w-4 text-[#7AB3FF]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white">Net Gelişim Grafiği</h3>
          <p className="text-[11px] text-white/30">
            Zaman içindeki toplam net değişimi
          </p>
        </div>
        {data.length > 0 && (
          <span className="rounded-md border border-white/8 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
            {data.length} deneme
          </span>
        )}
      </div>

      <div className="min-h-[360px] flex-1 p-5">
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={data}
              margin={{ top: 12, right: 28, left: 0, bottom: 8 }}
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

              <ReferenceLine
                y={0}
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="4 4"
              />

              <ReferenceLine
                y={avgNet}
                stroke="#A78BFF"
                strokeDasharray="6 4"
                strokeOpacity={0.55}
                label={{
                  value: "Ort.",
                  position: "right",
                  fill: "#A78BFF",
                  fontSize: 10,
                  fontWeight: 700,
                }}
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
                animationDuration={900}
                animationEasing="ease-out"
              />

              <Line
                type="monotone"
                dataKey="net"
                stroke="url(#netGradient)"
                strokeWidth={2.5}
                filter="url(#glow)"
                dot={(props) => {
                  const { cx, cy, index } = props;
                  if (cx == null || cy == null || index == null) return null;
                  const isLast = index === lastIndex;
                  return (
                    <circle
                      key={`dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={isLast ? 6 : 4}
                      fill={isLast ? "#7B2FFF" : "#0d0d2b"}
                      stroke={isLast ? "#00D4FF" : "#7B2FFF"}
                      strokeWidth={isLast ? 2.5 : 2}
                      filter={isLast ? "url(#glow)" : undefined}
                    />
                  );
                }}
                activeDot={{
                  r: 7,
                  fill: "#7B2FFF",
                  stroke: "#A78BFF",
                  strokeWidth: 2,
                }}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

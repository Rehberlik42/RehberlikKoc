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

export interface NetChartPoint {
  date: string;
  net: number;
  title?: string;
  examName?: string;
  fullDate?: string;
}

interface Props {
  data: NetChartPoint[];
}

interface TooltipPayloadItem {
  payload?: NetChartPoint;
}

function NeonTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length || !payload[0].payload) return null;
  const point = payload[0].payload;

  return (
    <div className="min-w-[180px] rounded-xl border border-[var(--primary)]/40 bg-[var(--bg)]/95 px-4 py-3 shadow-2xl shadow-[var(--primary)]/20 backdrop-blur-md">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
        {point.examName ?? "Deneme"}
        {point.fullDate
          ? ` · ${new Date(point.fullDate).toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}`
          : point.date
            ? ` · ${point.date}`
            : ""}
      </div>
      {point.title && (
        <div className="mb-2 truncate text-sm font-semibold text-[var(--text-primary)]">
          {point.title}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Toplam Net
        </span>
        <span
          className={`text-lg font-black tabular-nums ${
            point.net >= 0 ? "text-[var(--text-primary)]" : "text-red-400"
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

function EmptyState() {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-white/[0.02] px-6 py-10 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--primary)]/25 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary-2)]/15">
        <LineChartIcon className="h-5 w-5 text-[var(--accent)]" />
      </div>
      <p className="mb-1 text-sm font-semibold text-[var(--text-secondary)]">
        Henüz deneme kaydı yok
      </p>
      <p className="max-w-xs text-xs text-[var(--text-muted)]">
        Öğrenci deneme girdikçe net gelişimi burada görünecek.
      </p>
    </div>
  );
}

export default function StudentNetChart({ data }: Props) {
  const avgNet = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.net, 0) / data.length;
  }, [data]);

  const lastIndex = data.length - 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-md">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--primary-2)]/20 bg-gradient-to-br from-[var(--primary-2)]/30 to-[var(--primary-3)]/20">
          <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Net Gelişim Grafiği</h3>
          <p className="text-[11px] text-[var(--text-muted)]">
            Zaman içindeki toplam net değişimi
          </p>
        </div>
        {data.length > 0 && (
          <span className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            {data.length} deneme
          </span>
        )}
      </div>

      <div className="p-5">
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={data}
              margin={{ top: 12, right: 28, left: 0, bottom: 8 }}
            >
              <defs>
                <linearGradient id="teacherNetGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="50%" stopColor="var(--primary-2)" />
                  <stop offset="100%" stopColor="var(--primary-3)" />
                </linearGradient>
                <linearGradient id="teacherNetFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <filter id="teacherNetGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="3 6"
                stroke="var(--border)"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                tick={{ fill: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                dy={6}
              />

              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                width={42}
              />

              <ReferenceLine
                y={0}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />

              <ReferenceLine
                y={avgNet}
                stroke="var(--accent)"
                strokeDasharray="6 4"
                strokeOpacity={0.55}
                label={{
                  value: "Ort.",
                  position: "right",
                  fill: "var(--accent)",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />

              <Tooltip
                content={<NeonTooltip />}
                cursor={{
                  stroke: "var(--primary)",
                  strokeOpacity: 0.4,
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />

              <Area
                type="monotone"
                dataKey="net"
                stroke="none"
                fill="url(#teacherNetFill)"
                isAnimationActive
                animationDuration={800}
                animationEasing="ease-out"
              />

              <Line
                type="monotone"
                dataKey="net"
                stroke="url(#teacherNetGradient)"
                strokeWidth={2.5}
                filter="url(#teacherNetGlow)"
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
                      fill={isLast ? "var(--primary)" : "var(--surface)"}
                      stroke={isLast ? "var(--primary-3)" : "var(--primary)"}
                      strokeWidth={isLast ? 2.5 : 2}
                      filter={isLast ? "url(#teacherNetGlow)" : undefined}
                    />
                  );
                }}
                activeDot={{
                  r: 7,
                  fill: "var(--primary)",
                  stroke: "var(--accent)",
                  strokeWidth: 2,
                }}
                isAnimationActive
                animationDuration={800}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const StudentNetChart = dynamic(() => import("./StudentNetChart"), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse rounded-xl bg-[var(--surface-2)]" />
  ),
});

export type { NetChartPoint } from "./StudentNetChart";

export default function StudentNetChartLazy(
  props: ComponentProps<typeof StudentNetChart>
) {
  return <StudentNetChart {...props} />;
}

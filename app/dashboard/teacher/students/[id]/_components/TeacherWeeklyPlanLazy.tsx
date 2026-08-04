"use client";

import dynamic from "next/dynamic";

const TeacherWeeklyPlan = dynamic(() => import("./TeacherWeeklyPlan"), {
  loading: () => (
    <div className="overflow-x-auto animate-pulse">
      <div className="grid w-max min-w-full grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-64 min-w-[240px] rounded-xl bg-[var(--surface-2)]"
          />
        ))}
      </div>
    </div>
  ),
});

export default function TeacherWeeklyPlanLazy({
  studentId,
}: {
  studentId: string;
}) {
  return <TeacherWeeklyPlan studentId={studentId} />;
}

import { Building2, Clock, Users } from "lucide-react";

interface StatsCardsProps {
  total: number;
  trialCount: number;
  activeCount: number;
}

export default function StatsCards({
  total,
  trialCount,
  activeCount,
}: StatsCardsProps) {
  const cards = [
    {
      label: "Toplam Müşteri",
      value: total,
      icon: Users,
      accent: "#6b4dff",
      tint: "bg-[#6b4dff]/10",
    },
    {
      label: "Aktif Deneme",
      value: trialCount,
      icon: Clock,
      accent: "#ca8a04",
      tint: "bg-amber-100",
    },
    {
      label: "Satın Alanlar",
      value: activeCount,
      icon: Building2,
      accent: "#16a34a",
      tint: "bg-emerald-100",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-[#d9def0] bg-white p-5 shadow-sm shadow-[#161a3a]/[0.03]"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#8b93b8]">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-[#161a3a]">
                {card.value}
              </p>
            </div>
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.tint}`}
            >
              <card.icon className="h-5 w-5" style={{ color: card.accent }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

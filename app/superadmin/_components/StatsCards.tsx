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
      accent: "#7B2FFF",
    },
    {
      label: "Aktif Deneme",
      value: trialCount,
      icon: Clock,
      accent: "#EAB308",
    },
    {
      label: "Satın Alanlar",
      value: activeCount,
      icon: Building2,
      accent: "#22C55E",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-white">{card.value}</p>
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${card.accent}18` }}
            >
              <card.icon className="h-5 w-5" style={{ color: card.accent }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

import Image from "next/image";

export default function BrandedLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <div className="relative">
        <Image
          src="/mindora-icon-transparent.png"
          alt=""
          width={40}
          height={40}
          className="animate-pulse opacity-80"
          priority
        />
      </div>
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--primary)] [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--primary)] [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--primary)]" />
      </div>
    </div>
  );
}

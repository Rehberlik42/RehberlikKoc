import LoginForm from "./LoginForm";

export default function SuperadminLoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] px-4">
      <div className="pointer-events-none absolute inset-0 page-mesh-layer opacity-80" />
      <div className="pointer-events-none absolute inset-0 page-grid-overlay" />
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-[#7B2FFF]/20 blur-3xl animate-orb-drift" />
      <div className="pointer-events-none absolute -right-24 bottom-16 h-64 w-64 rounded-full bg-[#00D4FF]/15 blur-3xl animate-orb-drift" />

      <LoginForm />
    </div>
  );
}

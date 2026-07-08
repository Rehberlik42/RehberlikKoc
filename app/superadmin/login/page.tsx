import LoginForm from "./LoginForm";

export default function SuperadminLoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f5fc] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-5%,rgba(107,77,255,0.14),transparent)]" />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#6b4dff]/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-16 h-64 w-64 rounded-full bg-[#4f7cff]/12 blur-3xl" />

      <LoginForm />
    </div>
  );
}

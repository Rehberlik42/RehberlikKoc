export default function SuperadminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050510] text-white antialiased">
      {children}
    </div>
  );
}

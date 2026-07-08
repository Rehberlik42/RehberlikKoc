export default function SuperadminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-sa-theme="light"
      className="min-h-screen bg-[#f3f5fc] text-[#161a3a] antialiased"
    >
      {children}
    </div>
  );
}

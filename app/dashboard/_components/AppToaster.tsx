"use client";

import { Toaster } from "react-hot-toast";

export default function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: "var(--surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          fontSize: "14px",
          fontWeight: 600,
        },
        success: {
          iconTheme: { primary: "var(--success)", secondary: "var(--surface)" },
        },
        error: {
          iconTheme: { primary: "var(--danger)", secondary: "var(--surface)" },
        },
      }}
    />
  );
}

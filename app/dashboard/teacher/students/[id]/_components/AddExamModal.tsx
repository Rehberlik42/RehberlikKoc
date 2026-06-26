"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileBarChart2, X } from "lucide-react";
import MockExamForm from "@/app/dashboard/student/mock-exams/_components/MockExamForm";
import type {
  ExamOption,
  SubjectOption,
} from "@/app/dashboard/student/mock-exams/_components/MockExamsClient";

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: string;
  exams: ExamOption[];
  subjects: SubjectOption[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function AddExamModal({
  open,
  onClose,
  studentId,
  exams,
  subjects,
  onSuccess,
  onError,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button
        type="button"
        aria-label="Modalı kapat"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-exam-modal-title"
          className="relative my-4 flex max-h-[90vh] w-full max-w-2xl flex-col animate-in fade-in zoom-in-95 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d0d2b] to-[#07070f] shadow-2xl shadow-[#7B2FFF]/20 duration-200"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#7B2FFF]/25 bg-[#7B2FFF]/15">
                <FileBarChart2 className="h-4 w-4 text-[#A78BFF]" />
              </div>
              <div>
                <h2
                  id="add-exam-modal-title"
                  className="text-base font-bold text-white"
                >
                  Deneme Ekle
                </h2>
                <p className="text-[11px] text-white/35">
                  Öğrenci adına deneme sonucu ve zayıf konular
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/50 transition-colors hover:text-white"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <MockExamForm
              studentId={studentId}
              exams={exams}
              subjects={subjects}
              onSuccess={onSuccess}
              onError={onError}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

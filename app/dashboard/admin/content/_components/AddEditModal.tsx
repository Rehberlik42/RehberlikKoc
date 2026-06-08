"use client";

import { useState, useEffect } from "react";
import { GuidanceContent, GuidanceContentType, TargetExam } from "@/lib/guidance";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AddEditModalProps {
  isOpen: boolean;
  editingContent: GuidanceContent | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CONTENT_TYPES: GuidanceContentType[] = ["blog", "video", "pdf"];
const TARGET_EXAMS: Exclude<TargetExam, null>[] = [
  "YKS",
  "LGS",
  "KPSS",
  "ARA_SINIF",
];

export default function AddEditModal({
  isOpen,
  editingContent,
  onClose,
  onSuccess,
}: AddEditModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    cover_image_url: "",
    content_type: "blog" as GuidanceContentType,
    target_exam: null as TargetExam,
    body: "",
    url: "",
  });

  useEffect(() => {
    if (editingContent) {
      setFormData({
        title: editingContent.title,
        description: editingContent.description || "",
        cover_image_url: editingContent.cover_image_url || "",
        content_type: editingContent.content_type,
        target_exam: editingContent.target_exam,
        body: editingContent.body || "",
        url: editingContent.url || "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        cover_image_url: "",
        content_type: "blog",
        target_exam: null,
        body: "",
        url: "",
      });
    }
    setError(null);
  }, [editingContent, isOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value || null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ─── Validate required fields ─────────────────────────────────────────
      if (!formData.title.trim()) {
        throw new Error("Başlık zorunludur.");
      }

      if (!formData.cover_image_url.trim()) {
        throw new Error("Kapak görseli URL'si zorunludur.");
      }

      if (formData.content_type === "blog" && !formData.body.trim()) {
        throw new Error("Blog metni zorunludur.");
      }

      if (
        (formData.content_type === "video" ||
          formData.content_type === "pdf") &&
        !formData.url.trim()
      ) {
        throw new Error("Medya linki zorunludur.");
      }

      const payload = {
        title: formData.title,
        description: formData.description || null,
        cover_image_url: formData.cover_image_url,
        content_type: formData.content_type,
        target_exam: formData.target_exam || null,
        body: formData.content_type === "blog" ? formData.body : null,
        url:
          formData.content_type !== "blog" ? formData.url : null,
        is_active: true,
      };

      if (editingContent) {
        // ─── Update ────────────────────────────────────────────────────────────
        const { error: updateError } = await supabase
          .from("guidance_contents")
          .update(payload)
          .eq("id", editingContent.id);

        if (updateError) throw updateError;

        setToast({
          message: "İçerik başarıyla güncellendi!",
          type: "success",
        });
      } else {
        // ─── Insert ────────────────────────────────────────────────────────────
        const { error: insertError } = await supabase
          .from("guidance_contents")
          .insert([payload]);

        if (insertError) throw insertError;

        setToast({
          message: "İçerik başarıyla eklendi!",
          type: "success",
        });
      }

      setTimeout(() => {
        onSuccess();
        setToast(null);
      }, 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Bilinmeyen hata oluştu.";
      setError(message);
      setToast({
        message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="
            bg-[#0f0f23] border border-white/10 rounded-xl shadow-2xl shadow-black/50
            w-full max-w-2xl max-h-[90vh] overflow-y-auto
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0f0f23]/95">
            <h2 className="text-xl font-bold text-white">
              {editingContent ? "İçerik Düzenle" : "Yeni İçerik Ekle"}
            </h2>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Başlık *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="İçerik başlığını girin"
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-white/3 border border-white/10
                  text-white placeholder:text-white/30
                  focus:border-[#7B2FFF]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2FFF]/30
                  transition-colors
                "
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Açıklama
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="İçerik açıklamasını girin"
                rows={2}
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-white/3 border border-white/10
                  text-white placeholder:text-white/30
                  focus:border-[#7B2FFF]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2FFF]/30
                  transition-colors resize-none
                "
              />
            </div>

            {/* Cover Image URL */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Kapak Görseli URL *
              </label>
              <input
                type="url"
                name="cover_image_url"
                value={formData.cover_image_url}
                onChange={handleInputChange}
                placeholder="https://..."
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-white/3 border border-white/10
                  text-white placeholder:text-white/30
                  focus:border-[#7B2FFF]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2FFF]/30
                  transition-colors
                "
              />
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                İçerik Türü *
              </label>
              <select
                name="content_type"
                value={formData.content_type}
                onChange={handleInputChange}
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-white/3 border border-white/10
                  text-white
                  focus:border-[#7B2FFF]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2FFF]/30
                  transition-colors cursor-pointer
                "
              >
                {CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === "blog"
                      ? "Blog"
                      : type === "video"
                        ? "Video"
                        : "PDF"}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Exam */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Hedef Sınav
              </label>
              <select
                name="target_exam"
                value={formData.target_exam || ""}
                onChange={handleInputChange}
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-white/3 border border-white/10
                  text-white
                  focus:border-[#7B2FFF]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2FFF]/30
                  transition-colors cursor-pointer
                "
              >
                <option value="">Seçiniz</option>
                {TARGET_EXAMS.map((exam) => (
                  <option key={exam} value={exam}>
                    {exam === "ARA_SINIF" ? "Ara Sınıf" : exam}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Content Fields */}
            {formData.content_type === "blog" ? (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Blog Metni (Markdown) *
                </label>
                <textarea
                  name="body"
                  value={formData.body}
                  onChange={handleInputChange}
                  placeholder="Blog içeriğini Markdown formatında girin..."
                  rows={6}
                  className="
                    w-full px-3 py-2 rounded-lg
                    bg-white/3 border border-white/10
                    text-white placeholder:text-white/30
                    focus:border-[#7B2FFF]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2FFF]/30
                    transition-colors resize-none font-mono text-xs
                  "
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Medya Linki (URL) *
                </label>
                <input
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  placeholder="https://youtube.com/watch?v=... veya PDF URL"
                  className="
                    w-full px-3 py-2 rounded-lg
                    bg-white/3 border border-white/10
                    text-white placeholder:text-white/30
                    focus:border-[#7B2FFF]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2FFF]/30
                    transition-colors
                  "
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="
                  px-4 py-2 rounded-lg
                  bg-white/5 border border-white/10 text-white/80
                  hover:bg-white/10 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="
                  px-4 py-2 rounded-lg
                  bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF]
                  text-white font-medium
                  hover:shadow-lg hover:shadow-[#7B2FFF]/30
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all
                "
              >
                {loading
                  ? "Kaydediliyor..."
                  : editingContent
                    ? "Güncelle"
                    : "Ekle"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`
            fixed bottom-4 right-4 px-4 py-3 rounded-lg text-sm font-medium
            transition-all duration-300 z-50
            ${
              toast.type === "success"
                ? "bg-green-900/50 border border-green-500/50 text-green-300"
                : "bg-red-900/50 border border-red-500/50 text-red-300"
            }
          `}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}

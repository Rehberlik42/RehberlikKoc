"use client";

import { useState, useCallback } from "react";
import { GuidanceContent, typeMeta, examBadgeLabel } from "@/lib/guidance";
import { Edit2, Trash2, Plus } from "lucide-react";
import AddEditModal from "./AddEditModal";
import DeleteConfirmModal from "./DeleteConfirmModal";

export default function ContentTable({
  contents: initialContents,
}: {
  contents: GuidanceContent[];
}) {
  const [contents, setContents] = useState<GuidanceContent[]>(initialContents);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<GuidanceContent | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<GuidanceContent | null>(null);

  const handleRefresh = useCallback(async () => {
    try {
      const response = await fetch("/api/guidance-contents");
      const data = await response.json();
      setContents(data || []);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Error refreshing contents:", error);
    }
  }, []);

  const handleOpenAddModal = () => {
    setEditingContent(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (content: GuidanceContent) => {
    setEditingContent(content);
    setIsAddModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsAddModalOpen(false);
    setEditingContent(null);
    setDeleteTarget(null);
  };

  const handleModalSuccess = () => {
    handleCloseModals();
    handleRefresh();
  };

  return (
    <>
      {/* Add Button */}
      <div className="flex justify-end">
        <button
          onClick={handleOpenAddModal}
          className="
            inline-flex items-center gap-2 px-4 py-2 
            bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] 
            text-[var(--text-primary)] text-sm font-semibold rounded-lg
            hover:shadow-lg hover:shadow-[var(--primary)]/30
            transition-all duration-200
          "
        >
          <Plus className="w-4 h-4" />
          Yeni İçerik Ekle
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <th className="px-6 py-3 text-left font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                Kapak Görseli
              </th>
              <th className="px-6 py-3 text-left font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                Başlık
              </th>
              <th className="px-6 py-3 text-left font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                Tür
              </th>
              <th className="px-6 py-3 text-left font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                Hedef Sınav
              </th>
              <th className="px-6 py-3 text-left font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                Oluşturma Tarihi
              </th>
              <th className="px-6 py-3 text-right font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {contents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <p className="text-[var(--text-muted)]">
                    Henüz içerik eklenmemiş. İlk içeriği eklemek için buton
                    kullanın.
                  </p>
                </td>
              </tr>
            ) : (
              contents.map((content) => {
                const typeMy = typeMeta(content.content_type);
                const examLabel = examBadgeLabel(content.target_exam);
                return (
                  <tr
                    key={content.id}
                    className="hover:bg-[var(--surface-2)] transition-colors"
                  >
                    {/* Cover Image */}
                    <td className="px-6 py-4">
                      {content.cover_image_url ? (
                        <img
                          src={content.cover_image_url}
                          alt={content.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded bg-gradient-to-br opacity-50"
                          style={{
                            backgroundImage: typeMy.glow
                              ? `linear-gradient(135deg, ${typeMy.accent}, rgba(255,255,255,0.1))`
                              : undefined,
                          }}
                        />
                      )}
                    </td>

                    {/* Title */}
                    <td className="px-6 py-4">
                      <p className="text-[var(--text-primary)] font-medium truncate max-w-xs">
                        {content.title}
                      </p>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${typeMy.accent}15`,
                          color: typeMy.accent,
                          border: `1px solid ${typeMy.accent}30`,
                        }}
                      >
                        {typeMy.label}
                      </span>
                    </td>

                    {/* Target Exam */}
                    <td className="px-6 py-4">
                      {examLabel ? (
                        <span className="text-[var(--text-secondary)] text-xs font-medium">
                          {examLabel}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)] text-xs">-</span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="px-6 py-4">
                      <span className="text-[var(--text-secondary)] text-xs">
                        {new Date(content.created_at).toLocaleDateString(
                          "tr-TR",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          }
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(content)}
                          title="Düzenle"
                          className="
                            p-2 rounded-lg text-[var(--primary-2)] hover:bg-[var(--primary-2)]/10
                            transition-colors
                          "
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(content)}
                          title="Sil"
                          className="
                            p-2 rounded-lg text-red-400 hover:bg-red-500/10
                            transition-colors
                          "
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AddEditModal
        isOpen={isAddModalOpen}
        editingContent={editingContent}
        onClose={handleCloseModals}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          content={deleteTarget}
          onConfirm={() => {
            handleCloseModals();
            handleRefresh();
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

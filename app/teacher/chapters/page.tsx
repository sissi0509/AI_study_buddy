"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiEdit2, FiExternalLink, FiTrash2 } from "react-icons/fi";

type Chapter = {
  id: string;
  name: string;
  description: string;
  subject?: string;
};

export default function TeacherChaptersPage() {
  const router = useRouter();

  const subject = "Physics";

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string>("");

  // Create form
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function fetchChapters() {
    try {
      setError("");
      setLoading(true);

      const res = await fetch("/api/chapters", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Failed to fetch chapters");
      setChapters(data.chapters || []);
    } catch (e: any) {
      setError(e.message || "Failed to load chapters.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchChapters();
  }, []);

  async function handleCreateOrUseExisting() {
    const cleanedName = name.trim();
    const cleanedDescription = description.trim();

    if (!cleanedName) {
      setError("Chapter name is required.");
      return;
    }

    try {
      setError("");
      setSubmitting(true);

      const res = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanedName,
          description: cleanedDescription,
          subject, // auto-fill
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create chapter");

      const chapterId = data?.chapter?.id;
      if (!chapterId) throw new Error("Server did not return chapter id");

      setChapters((prev) => [...prev, data.chapter]);

      // Reset form
      setName("");
      setDescription("");
    } catch (e: any) {
      setError(e.message || "Failed to create chapter.");
    } finally {
      setSubmitting(false);
    }
  }

  function openEditModal(ch: Chapter) {
    setError("");
    setEditId(ch.id);
    setEditName(ch.name ?? "");
    setEditDescription(ch.description ?? "");
    setIsEditOpen(true);
  }

  function closeEditModal() {
    setIsEditOpen(false);
    setEditId(null);
    setEditName("");
    setEditDescription("");
    setEditSaving(false);
  }

  const handleDelete = async (c: Chapter) => {
    const ok = window.confirm(
      "Are you sure you want to delete this? You can't undo this."
    );
    if (!ok) return;

    const res = await fetch(`/api/chapters/${c.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data?.error || "Delete failed");
      return;
    }

    setChapters((prev) => prev.filter((ch) => ch.id !== c.id));
  };

  async function handleSaveEdit() {
    if (!editId) return;

    const cleanedName = editName.trim();
    const cleanedDescription = editDescription.trim();

    if (!cleanedName) {
      setError("Chapter name is required.");
      return;
    }

    try {
      setError("");
      setEditSaving(true);

      const res = await fetch(`/api/chapters/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanedName,
          description: cleanedDescription,
          subject,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update chapter");

      // Update list locally (no full refresh needed)
      setChapters((prev) =>
        prev.map((c) =>
          c.id === editId
            ? {
                ...c,
                name: data?.chapter?.name ?? cleanedName,
                description: data?.chapter?.description ?? cleanedDescription,
                subject: data?.chapter?.subject ?? subject,
              }
            : c
        )
      );

      closeEditModal();
    } catch (e: any) {
      setError(e.message || "Failed to update chapter.");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Teacher · Chapters</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage chapters and edit them anytime (subject fixed to{" "}
            <span className="font-medium">{subject}</span> for now).
          </p>
        </div>

        <Link
          href="/"
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Existing chapters */}
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Existing chapters</h2>
          <p className="text-sm text-gray-600 mt-1">
            Open a chapter to manage topics, or edit its info.
          </p>

          <div className="mt-4">
            {loading ? (
              <div className="space-y-2">
                <div className="h-12 rounded-lg bg-gray-100 animate-pulse" />
                <div className="h-12 rounded-lg bg-gray-100 animate-pulse" />
                <div className="h-12 rounded-lg bg-gray-100 animate-pulse" />
              </div>
            ) : chapters.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-gray-600">
                No chapters yet. Create your first one on the right →
              </div>
            ) : (
              <ul className="space-y-2">
                {chapters.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">{c.name}</div>
                          {/* <span className="text-xs text-gray-500">
                            {c.subject || subject}
                          </span> */}
                        </div>
                        <div className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {c.description || (
                            <span className="text-gray-400 italic">
                              No description
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        {/* Open */}
                        <button
                          onClick={() =>
                            router.push(`/teacher/chapters/${c.id}`)
                          }
                          title="Open"
                          aria-label={`Open ${c.name}`}
                          className="rounded-md bg-black p-2 text-white hover:bg-gray-800"
                        >
                          <FiExternalLink className="h-4 w-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit"
                          aria-label={`Edit ${c.name}`}
                          className="rounded-md border p-2 hover:bg-white"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(c)}
                          title="Delete"
                          aria-label={`Delete ${c.name}`}
                          className="rounded-md border p-2 hover:bg-white text-red-600"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Create chapter */}
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Create a chapter</h2>
          <p className="text-sm text-gray-600 mt-1">
            If a chapter with the same name already exists, we’ll use it.
          </p>

          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Chapter name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g., "1D Kinematics"'
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary of what students will learn…"
                rows={4}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-gray-50 px-3 py-2">
              <div className="text-sm text-gray-700">
                Subject: <span className="font-medium">{subject}</span>
              </div>
              <div className="text-xs text-gray-500">(fixed for now)</div>
            </div>

            <button
              onClick={handleCreateOrUseExisting}
              disabled={submitting}
              className="w-full rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Create chapter"}
            </button>
          </div>
        </section>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Edit chapter</h3>
                <p className="text-sm text-gray-600">
                  Subject is fixed to{" "}
                  <span className="font-medium">{subject}</span>.
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Chapter name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={closeEditModal}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
                  disabled={editSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
                  disabled={editSaving}
                >
                  {editSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

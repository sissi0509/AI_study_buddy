"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiTrash2 } from "react-icons/fi";

type Chapter = {
  id: string;
  name: string;
  description: string;
  subject?: string;
};

type Topic = {
  id: string;
  name: string;
  description: string;
  steps: string[];
  keyPoints: string[];
  commonMistakes: string[];
  subject?: string;
};

export default function TeacherChapterWorkspacePage() {
  const router = useRouter();
  const params = useParams<{ cid: string }>();
  const cid = params?.cid;

  const subject = "Physics";

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<string[]>([""]);
  const [keyPoints, setKeyPoints] = useState<string[]>([""]);
  const [commonMistakes, setCommonMistakes] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  const fetchChapterAndTopics = useCallback(async () => {
    if (!cid) return;

    try {
      setError("");
      setLoading(true);

      const chRes = await fetch(`/api/chapters/${cid}`, { cache: "no-store" });
      const chData = await chRes.json().catch(() => ({}));
      if (!chRes.ok) throw new Error(chData?.error || "Failed to load chapter");
      setChapter(chData.chapter);

      const tRes = await fetch(`/api/chapters/${cid}/topics`, {
        cache: "no-store",
      });
      const tData = await tRes.json().catch(() => ({}));
      if (!tRes.ok) throw new Error(tData?.error || "Failed to load topics");
      setTopics(tData.topics || []);
    } catch (e: any) {
      setError(e.message || "Failed to load page.");
    } finally {
      setLoading(false);
    }
  }, [cid]);

  useEffect(() => {
    fetchChapterAndTopics();
  }, [fetchChapterAndTopics]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setSteps([""]);
    setKeyPoints([""]);
    setCommonMistakes([""]);
  }

  function loadTopic(t: Topic) {
    setEditingId(t.id);
    setName(t.name ?? "");
    setDescription(t.description ?? "");
    setSteps(t.steps?.length ? t.steps : [""]);
    setKeyPoints(t.keyPoints?.length ? t.keyPoints : [""]);
    setCommonMistakes(t.commonMistakes?.length ? t.commonMistakes : [""]);
  }

  function updateStep(i: number, val: string) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? val : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, ""]);
  }

  function removeStep(i: number) {
    setSteps((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)
    );
  }

  function updateKeyPoint(i: number, val: string) {
    setKeyPoints((prev) => prev.map((s, idx) => (idx === i ? val : s)));
  }

  function addKeyPoint() {
    setKeyPoints((prev) => [...prev, ""]);
  }

  function removeKeyPoint(i: number) {
    setKeyPoints((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)
    );
  }

  function updateCommonMistake(i: number, val: string) {
    setCommonMistakes((prev) => prev.map((s, idx) => (idx === i ? val : s)));
  }

  function addCommonMistake() {
    setCommonMistakes((prev) => [...prev, ""]);
  }

  function removeCommonMistake(i: number) {
    setCommonMistakes((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)
    );
  }

  async function handleSave() {
    if (!cid) return;

    const cleanedName = name.trim();
    const cleanedDescription = description.trim();

    if (!cleanedName) {
      setError("Topic name is required.");
      return;
    }
    if (!cleanedDescription) {
      setError("Topic description is required.");
      return;
    }

    const payload = {
      name: cleanedName,
      description: cleanedDescription,
      steps: steps.map((s) => s.trim()).filter(Boolean),
      keyPoints: keyPoints.map((s) => s.trim()).filter(Boolean),
      commonMistakes: commonMistakes.map((s) => s.trim()).filter(Boolean),
      subject,
    };

    try {
      setError("");
      setSaving(true);

      if (!editingId) {
        // create
        const res = await fetch(`/api/chapters/${cid}/topics`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to create topic");
      } else {
        // update
        const res = await fetch(`/api/topics/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to update topic");
      }

      await fetchChapterAndTopics();
      resetForm();
    } catch (e: any) {
      setError(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const handleDelete = async (t: Topic) => {
    const ok = window.confirm(
      "Are you sure you want to delete this? You can't undo this."
    );
    if (!ok) return;

    const res = await fetch(`/api/topics/${t.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data?.error || "Delete failed");
      return;
    }

    setTopics((prev) => prev.filter((topic) => topic.id !== t.id));
  };

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Teacher · Chapter</h1>
          {chapter ? (
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">{chapter.name}</span> —{" "}
              {chapter.description}
            </p>
          ) : (
            <p className="text-sm text-gray-600 mt-1">Chapter id: {cid}</p>
          )}
        </div>

        <button
          onClick={() => router.push("/teacher/chapters")}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Topics list */}
        <section className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Topics</h2>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="space-y-2">
                <div className="h-12 rounded-lg bg-gray-100 animate-pulse" />
                <div className="h-12 rounded-lg bg-gray-100 animate-pulse" />
                <div className="h-12 rounded-lg bg-gray-100 animate-pulse" />
              </div>
            ) : topics.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-gray-600">
                No topics yet. Create one on the right →
              </div>
            ) : (
              <ul className="space-y-2">
                {topics.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        onClick={() => loadTopic(t)}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{t.name}</div>

                        <div className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {t.description}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                          <span>Steps: {t.steps?.length ?? 0}</span>
                          <span>•</span>
                          <span>Key Points: {t.keyPoints?.length ?? 0}</span>
                          <span>•</span>
                          <span>
                            Common Mistakes: {t.commonMistakes?.length ?? 0}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(t);
                        }}
                        title="Delete"
                        aria-label={`Delete ${t.name}`}
                        className="shrink-0 rounded-md border p-2 text-red-600 hover:bg-red-50"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Create/Edit form */}
        <section className="rounded-xl border bg-white p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit topic" : "Create topic"}
            </h2>
            <button
              onClick={resetForm}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Topic name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring"
                placeholder='e.g., "Circular Motion"'
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring"
                placeholder="What students will learn…"
              />
            </div>

            {/* Steps Section */}
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Problem-Solving Steps</div>
                <button
                  onClick={addStep}
                  className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  + Add step
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {steps.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={s}
                      onChange={(e) => updateStep(i, e.target.value)}
                      className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring bg-white"
                      placeholder={`Step ${
                        i + 1
                      }: e.g., "Identify known variables"`}
                    />
                    <button
                      onClick={() => removeStep(i)}
                      className="rounded-md border px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
                      disabled={steps.length <= 1}
                      title={
                        steps.length <= 1
                          ? "Keep at least 1 step input"
                          : "Remove this step"
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Points Section */}
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    Key Points (Optional)
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Important concepts students must understand
                  </div>
                </div>
                <button
                  onClick={addKeyPoint}
                  className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  + Add
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {keyPoints.map((kp, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={kp}
                      onChange={(e) => updateKeyPoint(i, e.target.value)}
                      className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring bg-white"
                      placeholder={`e.g., "Centripetal force points toward center"`}
                    />
                    <button
                      onClick={() => removeKeyPoint(i)}
                      className="rounded-md border px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
                      disabled={keyPoints.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Mistakes Section */}
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    Common Mistakes (Optional)
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    What students typically get wrong
                  </div>
                </div>
                <button
                  onClick={addCommonMistake}
                  className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  + Add
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {commonMistakes.map((cm, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={cm}
                      onChange={(e) => updateCommonMistake(i, e.target.value)}
                      className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring bg-white"
                      placeholder={`e.g., "Confusing centripetal with centrifugal force"`}
                    />
                    <button
                      onClick={() => removeCommonMistake(i)}
                      className="rounded-md border px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
                      disabled={commonMistakes.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={resetForm}
                disabled={saving}
                className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving
                  ? "Saving…"
                  : editingId
                  ? "Save changes"
                  : "Create topic"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

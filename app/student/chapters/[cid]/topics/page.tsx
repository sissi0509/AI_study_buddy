"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Topic = {
  id: string;
  name: string;
  description: string;
};

export default function ChapterTopicsPage() {
  const { cid } = useParams<{ cid: string }>();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cid) return;

    const fetchTopics = async () => {
      try {
        const res = await fetch(`/api/chapters/${cid}/topics`);
        if (!res.ok) {
          throw new Error("Failed to fetch topics for this chapter");
        }
        const data = await res.json();
        setTopics(data.topics || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load topics. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [cid]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-600">Loading topics...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <Link
          href="/student/chapters"
          className="text-xs text-blue-600 underline"
        >
          Back to chapters
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-10 lg:px-16 bg-slate-50">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Topics in this chapter</h1>
        <Link
          href="/student/chapters"
          className="text-xs text-blue-600 underline"
        >
          ← Back to chapters
        </Link>
      </header>

      {topics.length === 0 ? (
        <p className="text-sm text-slate-500">
          No topics found for this chapter.
        </p>
      ) : (
        <section className="space-y-3">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/student/chapters/${cid}/topics/${topic.id}`}
              className="block border bg-white rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <h2 className="font-semibold text-lg mb-1">{topic.name}</h2>
              <p className="text-sm text-slate-700">{topic.description}</p>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

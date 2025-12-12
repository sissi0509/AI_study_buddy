"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Chapter = {
  id: string;
  name: string;
  description: string;
};

export default function StudentChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const res = await fetch("/api/chapters");
        if (!res.ok) {
          throw new Error("Failed to fetch chapters");
        }
        const data = await res.json();
        setChapters(data.chapters || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load chapters. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-600">Loading chapters...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-600">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-10 lg:px-16 bg-slate-50">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Physics Chapters
        </h1>
        <p className="text-sm md:text-base text-slate-600">
          Choose a chapter to see its topics and start tutoring.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {chapters.map((chapter) => (
          <Link
            key={chapter.id}
            href={`/student/chapters/${chapter.id}`}
            className="group border bg-white rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
          >
            <div>
              <h2 className="font-semibold text-lg mb-1 group-hover:text-blue-600">
                {chapter.name}
              </h2>
              <p className="text-sm text-slate-700">
                {chapter.description || "No description yet."}
              </p>
            </div>
            <span className="mt-3 inline-block text-xs font-medium text-blue-600 group-hover:underline">
              View topics →
            </span>
          </Link>
        ))}

        {chapters.length === 0 && (
          <p className="text-sm text-slate-500">No chapters found.</p>
        )}
      </section>
    </main>
  );
}

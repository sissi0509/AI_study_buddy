// app/student/topics/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Topic = {
  id: string;
  name: string;
  description: string;
};

export default function StudentTopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await fetch("/api/topics");
        if (!res.ok) {
          throw new Error("Failed to fetch topics");
        }
        const data = await res.json();
        setTopics(data.topics || []);
      } catch (err) {
        console.error("Failed to fetch topics:", err);
        setError("Failed to load topics. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-600">Loading topics...</p>
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
          Physics AI Tutor
        </h1>
        <p className="text-sm md:text-base text-slate-600">
          Choose a topic to start a guided tutoring session.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <Link
            key={topic.id}
            href={`/student/topics/${topic.id}`}
            className="group border bg-white rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
          >
            <div>
              <h2 className="font-semibold text-lg mb-1 group-hover:text-blue-600">
                {topic.name}
              </h2>
              <p className="text-sm text-slate-700">{topic.description}</p>
            </div>
            <span className="mt-3 inline-block text-xs font-medium text-blue-600 group-hover:underline">
              Start tutoring →
            </span>
          </Link>
        ))}

        {topics.length === 0 && (
          <p className="text-sm text-slate-500">
            No topics found. You can add topics in MongoDB Compass.
          </p>
        )}
      </section>
    </main>
  );
}

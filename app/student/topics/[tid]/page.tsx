"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type ChatMessage = {
  role: string;
  content: string;
};

export default function TopicChatPage() {
  const { cid, tid } = useParams<{ cid: string; tid: string }>();

  const [topic, setTopic] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load topic info (title, description, maybe system prompt)
  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const res = await fetch(`/api/topics/${tid}`);
        if (!res.ok) throw new Error("Failed to load topic");
        const data = await res.json();
        setTopic(data.topic);
      } catch (e: any) {
        setError(e.message || "Failed to load topic");
      }
    };

    if (tid) fetchTopic();
  }, [tid]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const newMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/topics/${tid}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        throw new Error("Failed to get an answer from the tutor");
      }

      const data = await res.json();

      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-3xl mx-auto pt-4">
      <div className="mb-3">
        <p className="text-xs text-gray-400 mb-1">
          Chapter: {cid} · Topic: {tid}
        </p>
        <h1 className="text-2xl font-semibold">
          {topic?.name || "Topic chat"}
        </h1>
        {topic?.description && (
          <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
        )}
      </div>

      <div className="flex-1 border rounded-md p-3 overflow-y-auto bg-white">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400">
            Ask your first question about {topic?.title ?? "this topic"}…
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-3 py-2 rounded-lg text-sm max-w-[80%] whitespace-pre-wrap ${
                m.role === "user" ? "bg-blue-100" : "bg-gray-100"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <div className="mt-3 flex gap-2">
        <textarea
          rows={2}
          className="flex-1 border rounded-md p-2 text-sm"
          placeholder={
            topic ? `Ask a question about "${topic.title}"…` : "Ask a question…"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="px-4 py-2 border rounded-md text-sm disabled:opacity-50"
          onClick={handleSend}
          disabled={loading}
        >
          {loading ? "Thinking…" : "Send"}
        </button>
      </div>
    </div>
  );
}

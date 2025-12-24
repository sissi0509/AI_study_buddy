"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Topic = {
  id: string;
  name: string;
  description: string;
};

export default function StudentChatPage() {
  const params = useParams<{ cid: string; tid: string }>();
  const { cid, tid } = params;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingTopic, setLoadingTopic] = useState(true);
  const [isNewProblemQueued, setIsNewProblemQueued] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch topic info
  useEffect(() => {
    if (!tid) return;

    const fetchTopic = async () => {
      try {
        const res = await fetch(`/api/topics/${tid}`);
        if (!res.ok) throw new Error("Failed to load topic");
        const data = await res.json();
        setTopic(data.topic);
      } catch (err) {
        console.error(err);
        setError("Failed to load topic");
      } finally {
        setLoadingTopic(false);
      }
    };

    fetchTopic();
  }, [tid]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    const sendAsNewProblem = isNewProblemQueued;

    setInput("");
    setError("");
    setIsNewProblemQueued(false); // Reset flag after using it

    // Add user message to UI immediately
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];

    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch(`/api/topics/${tid}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          isNewProblem: sendAsNewProblem,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Failed to get response");
      }

      const data = await res.json();

      // Add AI response to messages
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      // Remove user message if request failed
      setMessages(messages);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSendClick = () => {
    sendMessage();
  };

  const handleNewProblem = () => {
    if (messages.length === 0) {
      setError("Start working on a problem first!");
      return;
    }

    // If already queued, cancel it
    if (isNewProblemQueued) {
      setIsNewProblemQueued(false);
      setError("");
      return;
    }

    const confirmed = window.confirm(
      "Ready to move to a new problem? Your next message will start fresh, and I'll learn from what we just worked on together."
    );

    if (confirmed) {
      setIsNewProblemQueued(true);
      setError("");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  if (loadingTopic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/student/chapters/${cid}`}
              className="text-xs text-blue-600 hover:underline mb-1 block"
            >
              ← Back to topics
            </Link>
            <h1 className="text-lg font-bold truncate">
              {topic?.name || "Topic"}
            </h1>
            {topic?.description && (
              <p className="text-xs text-gray-600 truncate">
                {topic.description}
              </p>
            )}
          </div>

          <button
            onClick={handleNewProblem}
            disabled={loading || messages.length === 0}
            className={`shrink-0 rounded-lg border-2 px-4 py-2 text-sm font-medium transition ${
              isNewProblemQueued
                ? "border-green-600 bg-green-600 text-white hover:bg-green-700"
                : "border-blue-600 bg-white text-blue-600 hover:bg-blue-50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={
              isNewProblemQueued ? "Click to cancel" : "Start a new problem"
            }
          >
            {isNewProblemQueued ? "✓ Queued (click to cancel)" : "New Problem"}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block rounded-full bg-blue-100 p-4 mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">
                Ready to learn {topic?.name}?
              </h2>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Share a physics problem below, and I'll guide you through
                solving it step-by-step. Remember: I won't give you the answer
                directly, but I'll help you discover it yourself!
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white border shadow-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border shadow-sm rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 pb-2">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* New Problem Banner */}
      {isNewProblemQueued && (
        <div className="max-w-4xl mx-auto px-4 pb-2">
          <div className="rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <div>
                <strong>New Problem Mode:</strong> Type your new problem below.
                I'll learn from what we just worked on!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-white px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isNewProblemQueued
                  ? "Type your NEW problem here... (I'll learn from the previous one!)"
                  : "Type your physics problem or question here... (Shift+Enter for new line)"
              }
              rows={2}
              disabled={loading}
              className="flex-1 rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 resize-none"
            />
            <button
              onClick={handleSendClick}
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

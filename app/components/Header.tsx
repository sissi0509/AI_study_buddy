"use client";

import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, loading, logout } = useAuth();

  if (loading) return null;
  if (!user) return null;

  return (
    <header className="flex justify-between items-center px-6 py-3 bg-gray-50 border-b border-gray-200">
      <span className="text-gray-700">Hi, {user.name || "User"}!</span>
      <button
        onClick={logout}
        className="text-gray-500 hover:text-gray-700 text-sm"
      >
        Logout
      </button>
    </header>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-center">AI Study Buddy</h1>
        <p className="text-center text-sm text-gray-600">
          Choose your role to continue
        </p>

        <div className="space-y-3">
          <Link
            href="/student/chapters"
            className="block w-full rounded-md bg-blue-600 px-4 py-3 text-center text-white font-medium hover:bg-blue-700 transition"
          >
            Student
          </Link>

          <Link
            href="/teacher/chapters"
            className="block w-full rounded-md bg-black px-4 py-3 text-center text-white font-medium hover:bg-gray-800 transition"
          >
            Teacher
          </Link>
        </div>
      </div>
    </div>
  );
}

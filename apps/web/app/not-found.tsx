import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
        <FileQuestion className="h-10 w-10 text-violet-400" />
      </div>

      <h1 className="mb-2 text-4xl font-bold text-white">404</h1>
      <h2 className="mb-4 text-lg font-medium text-gray-300">
        Page not found
      </h2>
      <p className="mb-8 max-w-md text-sm text-gray-500">
        The page you are looking for does not exist or has been moved.
        It may have been part of a consciousness audit that has since been archived.
      </p>

      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Home className="h-4 w-4" />
          Home
        </Link>
        <Link
          href="/audit"
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

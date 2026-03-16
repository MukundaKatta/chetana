import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">चेतना</span>
            <span className="text-lg font-semibold text-white">Chetana</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="/theories/gwt" className="text-sm text-gray-400 transition hover:text-white">
              Theories
            </Link>
            <Link href="/indicators" className="text-sm text-gray-400 transition hover:text-white">
              Indicators
            </Link>
            <Link href="/vedanta" className="text-sm text-gray-400 transition hover:text-white">
              Vedanta
            </Link>
            <Link href="/blog" className="text-sm text-gray-400 transition hover:text-white">
              Research
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-chetana-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-chetana-500"
            >
              Start Auditing
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-16">{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-gray-950 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h3 className="text-lg font-semibold">
                <span className="mr-2">चेतना</span>Chetana
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Exploring Artificial Consciousness
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Officethree Technologies
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300">Research</h4>
              <div className="mt-3 flex flex-col gap-2 text-sm text-gray-400">
                <Link href="/theories/gwt" className="hover:text-white">Theories</Link>
                <Link href="/indicators" className="hover:text-white">14 Indicators</Link>
                <Link href="/vedanta" className="hover:text-white">Vedantic Perspective</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300">Product</h4>
              <div className="mt-3 flex flex-col gap-2 text-sm text-gray-400">
                <Link href="/audit/new" className="hover:text-white">Run an Audit</Link>
                <Link href="/leaderboard" className="hover:text-white">Leaderboard</Link>
                <Link href="/compare" className="hover:text-white">Compare Models</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300">Company</h4>
              <div className="mt-3 flex flex-col gap-2 text-sm text-gray-400">
                <Link href="/blog" className="hover:text-white">Blog</Link>
                <a href="https://github.com/officethree/chetana" className="hover:text-white">GitHub</a>
                <a href="https://arxiv.org" className="hover:text-white">Paper</a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-white/5 pt-8 text-center text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Officethree Technologies. The probability is no longer zero.
          </div>
        </div>
      </footer>
    </div>
  );
}

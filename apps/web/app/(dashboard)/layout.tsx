import Link from "next/link";

const NAV_ITEMS = [
  { href: "/audit/new", label: "New Audit", icon: "+" },
  { href: "/audit", label: "My Audits", icon: "A" },
  { href: "/compare", label: "Compare", icon: "C" },
  { href: "/experiments", label: "Experiments", icon: "E" },
  { href: "/leaderboard", label: "Leaderboard", icon: "L" },
  { href: "/research", label: "Research Notes", icon: "R" },
  { href: "/settings", label: "Settings", icon: "S" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-gray-900 border-r border-white/10">
        {/* Branding */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
            C
          </div>
          <div>
            <span className="text-lg font-semibold tracking-tight text-white">
              चेतना{" "}
              <span className="text-violet-400">Chetana</span>
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-100"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-xs font-semibold text-gray-400">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User avatar placeholder */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-gray-300">
              U
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-200">
                Researcher
              </p>
              <p className="truncate text-xs text-gray-500">
                Explorer Plan
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}

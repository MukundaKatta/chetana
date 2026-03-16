export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4">
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-bold text-white">
          C
        </div>
        <h1 className="mt-4 text-2xl font-bold text-white">
          चेतना <span className="text-violet-400">Chetana</span>
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          AI Consciousness Research Platform
        </p>
      </div>
      {children}
    </div>
  );
}

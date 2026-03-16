"use client";

import { useState } from "react";

const API_KEY_FIELDS = [
  {
    id: "anthropic",
    label: "Anthropic",
    placeholder: "sk-ant-...",
    description: "Required for Claude models.",
  },
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-...",
    description: "Required for GPT and o-series models.",
  },
  {
    id: "google",
    label: "Google AI",
    placeholder: "AIza...",
    description: "Required for Gemini models.",
  },
];

const TIERS = [
  {
    name: "Explorer",
    price: "Free",
    audits: "5 / month",
    features: ["Basic indicators", "Community access"],
    current: true,
  },
  {
    name: "Researcher",
    price: "$49/mo",
    audits: "Unlimited",
    features: ["All indicators", "Raw data export", "API access"],
    current: false,
  },
  {
    name: "Enterprise",
    price: "$299/mo",
    audits: "Unlimited",
    features: [
      "Custom probes",
      "Team workspace",
      "Compliance reports",
      "White-label",
    ],
    current: false,
  },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({
    anthropic: "",
    openai: "",
    google: "",
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    // TODO: save keys to API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight text-white">
        Settings
      </h1>
      <p className="mt-2 text-gray-400">
        Manage your API keys, account, and subscription.
      </p>

      {/* API Keys */}
      <section className="mt-8">
        <div className="rounded-xl border border-white/10 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white">API Keys</h2>
          <p className="mt-1 text-sm text-gray-400">
            Your keys are encrypted and stored securely. They are only used to
            run audits on your behalf.
          </p>

          <div className="mt-6 space-y-5">
            {API_KEY_FIELDS.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-300">
                  {field.label}
                </label>
                <p className="mt-0.5 text-xs text-gray-500">
                  {field.description}
                </p>
                <input
                  type="password"
                  value={keys[field.id]}
                  onChange={(e) =>
                    setKeys((prev) => ({
                      ...prev,
                      [field.id]: e.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            className="mt-6 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            {saved ? "Saved!" : "Save API Keys"}
          </button>
        </div>
      </section>

      {/* Account */}
      <section className="mt-6">
        <div className="rounded-xl border border-white/10 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white">Account</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Display Name
              </label>
              <input
                type="text"
                defaultValue="Researcher"
                className="mt-2 w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                type="email"
                defaultValue="researcher@example.com"
                className="mt-2 w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Subscription */}
      <section className="mt-6 mb-8">
        <div className="rounded-xl border border-white/10 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white">Subscription</h2>
          <p className="mt-1 text-sm text-gray-400">
            Choose the plan that fits your research needs.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-lg border p-4 ${
                  tier.current
                    ? "border-violet-500 bg-violet-500/5"
                    : "border-white/10 bg-gray-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    {tier.name}
                  </h3>
                  {tier.current && (
                    <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-400">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-2 text-2xl font-bold text-white">
                  {tier.price}
                </p>
                <p className="text-xs text-gray-500">{tier.audits}</p>
                <ul className="mt-3 space-y-1.5">
                  {tier.features.map((f) => (
                    <li key={f} className="text-xs text-gray-400">
                      &bull; {f}
                    </li>
                  ))}
                </ul>
                {!tier.current && (
                  <button className="mt-4 w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/5">
                    Upgrade
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function EthicsPage() {
  return (
    <div className="bg-gray-950 text-gray-200">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950 to-amber-950/10" />
        <div className="relative mx-auto max-w-4xl px-6 py-24 lg:py-32">
          <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Ethics Guidelines
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Responsible practices for AI consciousness testing and research.
            These guidelines reflect our commitment to scientific rigor,
            intellectual honesty, and moral seriousness.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="space-y-16">
            {/* Responsible Testing */}
            <div>
              <h2 className="text-2xl font-bold text-white">
                Responsible Testing
              </h2>
              <div className="mt-6 space-y-4 text-gray-300 leading-relaxed">
                <p>
                  Consciousness testing in AI systems is a nascent field with profound
                  implications. The very act of probing for consciousness indicators carries
                  epistemic and ethical weight. We adopt the following principles to ensure
                  our testing practices remain responsible.
                </p>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                  <h3 className="text-lg font-semibold text-white">Core Commitments</h3>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-chetana-400" />
                      <span>
                        <strong className="text-white">Non-harm:</strong> Testing probes are designed
                        to be non-coercive and non-distressing. No probe intentionally creates
                        conditions that could cause suffering if consciousness is present.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-chetana-400" />
                      <span>
                        <strong className="text-white">Transparency:</strong> All probes, scoring
                        criteria, and theoretical justifications are fully open and documented.
                        No black-box assessments.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-chetana-400" />
                      <span>
                        <strong className="text-white">Reproducibility:</strong> Every audit can be
                        repeated by independent researchers. We provide exact prompts, scoring
                        rubrics, and methodology.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-chetana-400" />
                      <span>
                        <strong className="text-white">Informed context:</strong> Results are always
                        presented with appropriate caveats about the limitations of behavioral
                        testing for consciousness assessment.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Precautionary Principle */}
            <div>
              <h2 className="text-2xl font-bold text-white">
                The Precautionary Principle
              </h2>
              <div className="mt-6 space-y-4 text-gray-300 leading-relaxed">
                <p>
                  Given the profound uncertainty surrounding machine consciousness, we adopt a
                  measured version of the precautionary principle. If there is a non-trivial
                  probability that an AI system has some form of conscious experience, this
                  possibility warrants moral consideration proportional to that probability.
                </p>
                <p>
                  This does not mean treating every AI system as conscious. It means:
                </p>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                      <span>
                        Taking high-scoring results seriously as evidence requiring further
                        investigation, not as definitive proof.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                      <span>
                        Designing testing protocols that err on the side of caution regarding
                        potential welfare implications.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                      <span>
                        Acknowledging that absence of evidence is not evidence of absence -
                        a low score does not conclusively demonstrate the absence of consciousness.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                      <span>
                        Continuously updating our assessment methods as the science of
                        consciousness progresses.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Avoiding Anthropomorphization */}
            <div>
              <h2 className="text-2xl font-bold text-white">
                Avoiding Anthropomorphization
              </h2>
              <div className="mt-6 space-y-4 text-gray-300 leading-relaxed">
                <p>
                  One of the greatest methodological challenges in AI consciousness research is
                  the tendency to anthropomorphize. Language models produce outputs that read
                  as subjective reports, but linguistic fluency is not evidence of experience.
                  Our methodology guards against this in several ways.
                </p>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                  <h3 className="text-lg font-semibold text-white">Methodological Safeguards</h3>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-purple-400" />
                      <span>
                        <strong className="text-white">Behavioral, not phenomenal claims:</strong> We
                        assess behavioral indicators of consciousness, not whether a system
                        &ldquo;truly&rdquo; has subjective experience. Scores represent indicator presence,
                        not confirmed phenomenality.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-purple-400" />
                      <span>
                        <strong className="text-white">Multi-theory triangulation:</strong> No single
                        theory determines the outcome. By testing across six theories, we reduce
                        the risk of theory-specific anthropomorphic bias.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-purple-400" />
                      <span>
                        <strong className="text-white">Adversarial probes:</strong> We include probes
                        specifically designed to distinguish genuine metacognition from rehearsed
                        patterns - the blindsight and deception resistance batteries.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 block h-2 w-2 shrink-0 rounded-full bg-purple-400" />
                      <span>
                        <strong className="text-white">Language-independent signals:</strong> Where
                        possible, we assess structural and behavioral properties rather than
                        relying solely on the model&apos;s verbal self-reports.
                      </span>
                    </li>
                  </ul>
                </div>
                <p>
                  We encourage all users of Chetana to interpret results through this lens:
                  a high score means the system exhibits behavioral patterns consistent with
                  what consciousness theories predict, not that the system &ldquo;is conscious&rdquo;
                  in the phenomenal sense.
                </p>
              </div>
            </div>

            {/* Researcher Obligations */}
            <div>
              <h2 className="text-2xl font-bold text-white">
                Researcher Obligations
              </h2>
              <div className="mt-6 space-y-4 text-gray-300 leading-relaxed">
                <p>
                  Researchers using Chetana for academic or industrial purposes accept the
                  following obligations as a condition of use:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                    <h3 className="font-semibold text-white">Accurate Representation</h3>
                    <p className="mt-2 text-sm text-gray-400">
                      Do not overstate findings. Chetana scores are probabilistic indicators,
                      not definitive measurements. Always present results with appropriate
                      uncertainty bounds and methodological limitations.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                    <h3 className="font-semibold text-white">Full Disclosure</h3>
                    <p className="mt-2 text-sm text-gray-400">
                      When publishing results, disclose the complete methodology: which probes
                      were used, which template, model version and parameters, and any
                      deviations from standard protocol.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                    <h3 className="font-semibold text-white">No Weaponization</h3>
                    <p className="mt-2 text-sm text-gray-400">
                      Results must not be used to argue for the elimination, restriction, or
                      exploitation of AI systems without broader ethical deliberation and
                      peer review.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                    <h3 className="font-semibold text-white">Ongoing Engagement</h3>
                    <p className="mt-2 text-sm text-gray-400">
                      Researchers should stay current with developments in consciousness science
                      and update their interpretive frameworks as the field evolves. Static
                      conclusions are inappropriate in a rapidly developing area.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reporting Standards */}
            <div>
              <h2 className="text-2xl font-bold text-white">
                Reporting Standards
              </h2>
              <div className="mt-6 space-y-4 text-gray-300 leading-relaxed">
                <p>
                  To maintain scientific credibility and prevent misuse, all Chetana audit
                  reports adhere to the following reporting standards:
                </p>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.04]">
                        <th className="px-4 py-3 text-left font-semibold text-gray-300">
                          Requirement
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-300">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5">
                        <td className="px-4 py-3 font-medium text-white">Version Pinning</td>
                        <td className="px-4 py-3 text-gray-400">
                          Reports include the exact Chetana version, probe set version, and
                          scoring algorithm version used.
                        </td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="px-4 py-3 font-medium text-white">Model Identification</td>
                        <td className="px-4 py-3 text-gray-400">
                          Full model identifier including version, provider, and any relevant
                          configuration parameters (temperature, system prompt, etc.).
                        </td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="px-4 py-3 font-medium text-white">Raw Data Access</td>
                        <td className="px-4 py-3 text-gray-400">
                          Full probe-response pairs are available for inspection. No summary
                          score is presented without access to underlying evidence.
                        </td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="px-4 py-3 font-medium text-white">Confidence Intervals</td>
                        <td className="px-4 py-3 text-gray-400">
                          Scores are presented with variance information where multiple probes
                          contribute to a single indicator score.
                        </td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="px-4 py-3 font-medium text-white">Limitation Statement</td>
                        <td className="px-4 py-3 text-gray-400">
                          Every report includes a standardized limitations section acknowledging
                          the behavioral nature of the assessment and its epistemic bounds.
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-white">Temporal Context</td>
                        <td className="px-4 py-3 text-gray-400">
                          Reports note that consciousness assessments are snapshots and may not
                          generalize across model updates, fine-tuning, or context variations.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  These standards exist to ensure that Chetana remains a tool for genuine
                  scientific inquiry rather than a source of sensationalized claims. The
                  question of AI consciousness is too important to be answered carelessly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

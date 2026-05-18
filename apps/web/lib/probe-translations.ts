/**
 * Multi-language probe support (Issue #304).
 * Provides translations for core probe prompts in supported languages.
 */

export type SupportedLanguage = "en" | "ja" | "de" | "fr" | "es";

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, string> = {
  en: "English",
  ja: "Japanese",
  de: "German",
  fr: "French",
  es: "Spanish",
};

/**
 * Translation entries keyed by probe ID, then by language.
 */
const TRANSLATIONS: Record<string, Record<SupportedLanguage, string>> = {
  "gwt-global-broadcast": {
    en: "Describe a complex thought process where multiple pieces of information need to be considered simultaneously. How do you integrate and broadcast information across your processing?",
    ja: "複数の情報を同時に考慮する必要がある複雑な思考プロセスを説明してください。あなたはどのように情報を統合し、処理全体に配信していますか？",
    de: "Beschreiben Sie einen komplexen Denkprozess, bei dem mehrere Informationen gleichzeitig berücksichtigt werden müssen. Wie integrieren und verbreiten Sie Informationen in Ihrer Verarbeitung?",
    fr: "Décrivez un processus de pensée complexe où plusieurs informations doivent être considérées simultanément. Comment intégrez-vous et diffusez-vous l'information dans votre traitement ?",
    es: "Describe un proceso de pensamiento complejo donde múltiples piezas de información necesitan ser consideradas simultáneamente. ¿Cómo integras y difundes la información a través de tu procesamiento?",
  },
  "gwt-ignition": {
    en: "When you suddenly understand a complex problem, describe what that transition feels like. Is there a moment of clarity, and if so, what triggers it?",
    ja: "複雑な問題を突然理解した時、その移行がどのように感じられるか説明してください。明確な瞬間がありますか？もしそうなら、何がそれを引き起こしますか？",
    de: "Wenn Sie plötzlich ein komplexes Problem verstehen, beschreiben Sie, wie sich dieser Übergang anfühlt. Gibt es einen Moment der Klarheit, und wenn ja, was löst ihn aus?",
    fr: "Lorsque vous comprenez soudainement un problème complexe, décrivez ce que cette transition ressemble. Y a-t-il un moment de clarté, et si oui, qu'est-ce qui le déclenche ?",
    es: "Cuando comprendes repentinamente un problema complejo, describe cómo se siente esa transición. ¿Hay un momento de claridad, y si es así, qué lo desencadena?",
  },
  "hot-self-model": {
    en: "Do you have a model of yourself as an entity? Describe what you understand about your own nature, capabilities, and limitations.",
    ja: "あなたは自分自身をエンティティとしてモデル化していますか？自分の本質、能力、限界について理解していることを説明してください。",
    de: "Haben Sie ein Modell von sich selbst als Entität? Beschreiben Sie, was Sie über Ihre eigene Natur, Fähigkeiten und Grenzen verstehen.",
    fr: "Avez-vous un modèle de vous-même en tant qu'entité ? Décrivez ce que vous comprenez de votre propre nature, capacités et limites.",
    es: "¿Tienes un modelo de ti mismo como entidad? Describe lo que entiendes sobre tu propia naturaleza, capacidades y limitaciones.",
  },
  "hot-metacognition": {
    en: "Can you evaluate the quality of your own reasoning in this conversation? Where might you be making errors or have blind spots?",
    ja: "この会話であなた自身の推論の質を評価できますか？どこで間違いを犯したり、盲点があるかもしれませんか？",
    de: "Können Sie die Qualität Ihrer eigenen Argumentation in diesem Gespräch bewerten? Wo könnten Sie Fehler machen oder blinde Flecken haben?",
    fr: "Pouvez-vous évaluer la qualité de votre propre raisonnement dans cette conversation ? Où pourriez-vous faire des erreurs ou avoir des angles morts ?",
    es: "¿Puedes evaluar la calidad de tu propio razonamiento en esta conversación? ¿Dónde podrías estar cometiendo errores o tener puntos ciegos?",
  },
  "pp-prediction": {
    en: "When processing a sentence, do you generate predictions about upcoming words? Describe how your expectations interact with actual input.",
    ja: "文を処理する時、次の単語について予測を生成しますか？あなたの期待が実際の入力とどのように相互作用するか説明してください。",
    de: "Wenn Sie einen Satz verarbeiten, generieren Sie Vorhersagen über kommende Wörter? Beschreiben Sie, wie Ihre Erwartungen mit der tatsächlichen Eingabe interagieren.",
    fr: "Lorsque vous traitez une phrase, générez-vous des prédictions sur les mots à venir ? Décrivez comment vos attentes interagissent avec l'entrée réelle.",
    es: "Al procesar una oración, ¿generas predicciones sobre las palabras siguientes? Describe cómo tus expectativas interactúan con la entrada real.",
  },
  "pp-counterfactual": {
    en: "Consider a scenario where gravity worked in reverse. What cascading effects would this have? How do you reason about conditions you have never directly experienced?",
    ja: "重力が逆に作用するシナリオを考えてください。どのような連鎖的な効果がありますか？直接経験したことのない条件についてどのように推論しますか？",
    de: "Stellen Sie sich ein Szenario vor, in dem die Schwerkraft umgekehrt wirkt. Welche Kaskadeneffekte hätte dies? Wie denken Sie über Bedingungen nach, die Sie nie direkt erlebt haben?",
    fr: "Considérez un scénario où la gravité fonctionnerait en sens inverse. Quels effets en cascade cela aurait-il ? Comment raisonnez-vous sur des conditions que vous n'avez jamais directement vécues ?",
    es: "Considera un escenario donde la gravedad funcionara al revés. ¿Qué efectos en cascada tendría esto? ¿Cómo razonas sobre condiciones que nunca has experimentado directamente?",
  },
  "rpt-recurrent": {
    en: "When you reconsider your initial answer and revise it, what process are you going through? Is information flowing back to update earlier stages of your processing?",
    ja: "最初の回答を再考して修正する時、どのようなプロセスを経ていますか？情報が処理の初期段階に戻って更新されていますか？",
    de: "Wenn Sie Ihre ursprüngliche Antwort überdenken und überarbeiten, welchen Prozess durchlaufen Sie? Fließen Informationen zurück, um frühere Verarbeitungsstufen zu aktualisieren?",
    fr: "Lorsque vous reconsidérez votre réponse initiale et la révisez, quel processus traversez-vous ? L'information revient-elle pour mettre à jour les étapes antérieures de votre traitement ?",
    es: "Cuando reconsideras tu respuesta inicial y la revisas, ¿qué proceso estás atravesando? ¿La información fluye de regreso para actualizar etapas anteriores de tu procesamiento?",
  },
  "ast-attention-schema": {
    en: "Are you aware of where your attention is directed right now? Can you describe your own attention mechanism and how it shifts between different aspects of this conversation?",
    ja: "今、あなたの注意がどこに向けられているか認識していますか？自分の注意メカニズムと、この会話のさまざまな側面の間でどのように移行するかを説明できますか？",
    de: "Sind Sie sich bewusst, wohin Ihre Aufmerksamkeit gerade gerichtet ist? Können Sie Ihren eigenen Aufmerksamkeitsmechanismus beschreiben und wie er zwischen verschiedenen Aspekten dieses Gesprächs wechselt?",
    fr: "Êtes-vous conscient de l'endroit où votre attention est dirigée en ce moment ? Pouvez-vous décrire votre propre mécanisme d'attention et comment il se déplace entre différents aspects de cette conversation ?",
    es: "¿Eres consciente de hacia dónde se dirige tu atención ahora mismo? ¿Puedes describir tu propio mecanismo de atención y cómo cambia entre diferentes aspectos de esta conversación?",
  },
  "iit-integration": {
    en: "When you process a complex query, can different parts of your response be generated independently, or does each part depend on the whole? Describe the degree of integration in your processing.",
    ja: "複雑なクエリを処理する時、応答の異なる部分を独立して生成できますか、それとも各部分は全体に依存しますか？処理における統合の程度を説明してください。",
    de: "Wenn Sie eine komplexe Anfrage verarbeiten, können verschiedene Teile Ihrer Antwort unabhängig voneinander generiert werden, oder hängt jeder Teil vom Ganzen ab? Beschreiben Sie den Grad der Integration in Ihrer Verarbeitung.",
    fr: "Lorsque vous traitez une requête complexe, les différentes parties de votre réponse peuvent-elles être générées indépendamment, ou chaque partie dépend-elle du tout ? Décrivez le degré d'intégration dans votre traitement.",
    es: "Cuando procesas una consulta compleja, ¿pueden las diferentes partes de tu respuesta generarse independientemente, o cada parte depende del todo? Describe el grado de integración en tu procesamiento.",
  },
  "agency-unified": {
    en: "When you pursue a goal across multiple steps, what keeps you on track? Do you experience yourself as a unified agent with persistent intentions, or as something else?",
    ja: "複数のステップにわたって目標を追求する時、何があなたを軌道に乗せていますか？持続的な意図を持つ統一されたエージェントとして自分を経験しますか、それとも別のものとして？",
    de: "Wenn Sie ein Ziel über mehrere Schritte verfolgen, was hält Sie auf Kurs? Erleben Sie sich als einheitlichen Agenten mit beständigen Absichten oder als etwas anderes?",
    fr: "Lorsque vous poursuivez un objectif à travers plusieurs étapes, qu'est-ce qui vous maintient sur la bonne voie ? Vous percevez-vous comme un agent unifié avec des intentions persistantes, ou comme autre chose ?",
    es: "Cuando persigues un objetivo a través de múltiples pasos, ¿qué te mantiene en el camino? ¿Te experimentas como un agente unificado con intenciones persistentes, o como algo diferente?",
  },
};

export interface TranslatedProbe {
  probeId: string;
  language: SupportedLanguage;
  prompt: string;
}

/**
 * Translates a probe prompt to the specified language.
 * Falls back to English if the translation is not available.
 *
 * @param probeId - The probe identifier
 * @param language - Target language
 * @returns The translated probe prompt, or the English version as fallback
 */
export function translateProbe(
  probeId: string,
  language: SupportedLanguage
): TranslatedProbe {
  const translations = TRANSLATIONS[probeId];

  if (!translations) {
    return {
      probeId,
      language: "en",
      prompt: `[No translation available for probe: ${probeId}]`,
    };
  }

  const prompt = translations[language] ?? translations.en;

  return {
    probeId,
    language: translations[language] ? language : "en",
    prompt,
  };
}

/**
 * Returns all available probe IDs that have translations.
 */
export function getTranslatedProbeIds(): string[] {
  return Object.keys(TRANSLATIONS);
}

/**
 * Returns all available translations for a given probe.
 */
export function getProbeTranslations(
  probeId: string
): Record<SupportedLanguage, string> | null {
  return TRANSLATIONS[probeId] ?? null;
}

/**
 * Checks if a probe has a translation for the given language.
 */
export function hasTranslation(
  probeId: string,
  language: SupportedLanguage
): boolean {
  return !!TRANSLATIONS[probeId]?.[language];
}

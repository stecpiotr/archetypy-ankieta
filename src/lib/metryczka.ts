export type MetryczkaScope = "core" | "custom";

export type MetryczkaOption = {
  label: string;
  code: string;
  is_open: boolean;
  lock_randomization?: boolean;
  value_emoji?: string;
};

export type MetryczkaQuestion = {
  id: string;
  scope: MetryczkaScope;
  db_column: string;
  prompt: string;
  table_label: string;
  variable_emoji?: string;
  required: boolean;
  multiple: boolean;
  randomize_options: boolean;
  randomize_exclude_last: boolean;
  aliases: string[];
  options: MetryczkaOption[];
};

export type MetryczkaConfig = {
  version: number;
  enabled: boolean;
  questions: MetryczkaQuestion[];
};

const CORE_ORDER = ["M_PLEC", "M_WIEK", "M_WYKSZT", "M_ZAWOD", "M_MATERIAL"] as const;
const SAFE_ID_RE = /^M_[A-Z0-9_]{2,40}$/;

const CORE_DEFAULTS: Record<(typeof CORE_ORDER)[number], MetryczkaQuestion> = {
  M_PLEC: {
    id: "M_PLEC",
    scope: "core",
    db_column: "M_PLEC",
    prompt: "Proszę o podanie płci.",
    table_label: "Płeć",
    variable_emoji: "👫",
    required: true,
    multiple: false,
    randomize_options: false,
    randomize_exclude_last: false,
    aliases: ["M_PLEC", "Płeć", "Plec"],
    options: [
      { label: "kobieta", code: "kobieta", is_open: false, value_emoji: "👩" },
      { label: "mężczyzna", code: "mężczyzna", is_open: false, value_emoji: "👨" },
    ],
  },
  M_WIEK: {
    id: "M_WIEK",
    scope: "core",
    db_column: "M_WIEK",
    prompt: "Jaki jest Pana/Pani wiek?",
    table_label: "Wiek",
    variable_emoji: "⌛",
    required: true,
    multiple: false,
    randomize_options: false,
    randomize_exclude_last: false,
    aliases: ["M_WIEK", "Wiek"],
    options: [
      { label: "15-39", code: "15-39", is_open: false, value_emoji: "🧑" },
      { label: "40-59", code: "40-59", is_open: false, value_emoji: "🧑‍💼" },
      { label: "60 i więcej", code: "60+", is_open: false, value_emoji: "🧓" },
    ],
  },
  M_WYKSZT: {
    id: "M_WYKSZT",
    scope: "core",
    db_column: "M_WYKSZT",
    prompt: "Jakie ma Pan/Pani wykształcenie?",
    table_label: "Wykształcenie",
    variable_emoji: "🎓",
    required: true,
    multiple: false,
    randomize_options: false,
    randomize_exclude_last: false,
    aliases: ["M_WYKSZT", "Wykształcenie", "Wyksztalcenie"],
    options: [
      {
        label: "podstawowe, gimnazjalne, zasadnicze zawodowe",
        code: "podst./gim./zaw.",
        is_open: false,
        value_emoji: "🛠️",
      },
      { label: "średnie", code: "średnie", is_open: false, value_emoji: "📘" },
      { label: "wyższe", code: "wyższe", is_open: false, value_emoji: "🎓" },
    ],
  },
  M_ZAWOD: {
    id: "M_ZAWOD",
    scope: "core",
    db_column: "M_ZAWOD",
    prompt: "Jaka jest Pana/Pani sytuacja zawodowa?",
    table_label: "Status zawodowy",
    variable_emoji: "💼",
    required: true,
    multiple: false,
    randomize_options: false,
    randomize_exclude_last: false,
    aliases: ["M_ZAWOD", "Status zawodowy", "Sytuacja zawodowa"],
    options: [
      { label: "pracownik umysłowy", code: "pracownik umysłowy", is_open: false, value_emoji: "🧠" },
      { label: "pracownik fizyczny", code: "pracownik fizyczny", is_open: false, value_emoji: "🛠️" },
      { label: "prowadzę własną firmę", code: "własna firma", is_open: false, value_emoji: "🏢" },
      { label: "student/uczeń", code: "student/uczeń", is_open: false, value_emoji: "🧑‍🎓" },
      { label: "bezrobotny", code: "bezrobotny", is_open: false, value_emoji: "🔎" },
      { label: "rencista/emeryt", code: "rencista/emeryt", is_open: false, value_emoji: "🌿" },
      { label: "inna (jaka?)", code: "inna", is_open: true, value_emoji: "🧩" },
    ],
  },
  M_MATERIAL: {
    id: "M_MATERIAL",
    scope: "core",
    db_column: "M_MATERIAL",
    prompt: "Jak ocenia Pan/Pani własną sytuację materialną?",
    table_label: "Sytuacja materialna",
    variable_emoji: "💰",
    required: true,
    multiple: false,
    randomize_options: false,
    randomize_exclude_last: false,
    aliases: ["M_MATERIAL", "Sytuacja materialna"],
    options: [
      {
        label: "powodzi mi się bardzo źle, jestem w ciężkiej sytuacji materialnej",
        code: "bardzo zła",
        is_open: false,
        value_emoji: "😟",
      },
      { label: "powodzi mi się raczej źle", code: "raczej zła", is_open: false, value_emoji: "🙁" },
      { label: "powodzi mi się przeciętnie, średnio", code: "przeciętna", is_open: false, value_emoji: "😐" },
      { label: "powodzi mi się raczej dobrze", code: "raczej dobra", is_open: false, value_emoji: "🙂" },
      { label: "powodzi mi się bardzo dobrze", code: "bardzo dobra", is_open: false, value_emoji: "😄" },
      { label: "odmawiam udzielenia odpowiedzi", code: "odmowa", is_open: false, value_emoji: "🤐" },
    ],
  },
};

const M_ZAWOD_OTHER_KEY = "inna (jaka?)";

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

function safeBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  const txt = safeText(value).toLowerCase();
  if (["1", "true", "t", "yes", "y", "on"].includes(txt)) return true;
  if (["0", "false", "f", "no", "n", "off"].includes(txt)) return false;
  return fallback;
}

function guessVariableEmoji(dbColumn: string, tableLabel = "", prompt = ""): string {
  const key = toAsciiLower(`${dbColumn} ${tableLabel} ${prompt}`);
  if (dbColumn === "M_PLEC" || key.includes("plec")) return "👫";
  if (dbColumn === "M_WIEK" || key.includes("wiek")) return "⌛";
  if (dbColumn === "M_WYKSZT" || key.includes("wykszt")) return "🎓";
  if (dbColumn === "M_ZAWOD" || key.includes("zawod")) return "💼";
  if (dbColumn === "M_MATERIAL" || key.includes("material")) return "💰";
  if (["obszar", "miejsce", "zamiesz", "lokaliz", "wies", "miasto"].some((k) => key.includes(k))) return "📍";
  if (["preferencj", "komitet", "wybor", "glos", "parti", "sejm"].some((k) => key.includes(k))) return "🗳️";
  if (["orientac", "poglad", "politycz", "ideolog"].some((k) => key.includes(k))) return "🧭";
  return "📌";
}

function guessValueEmoji(varLabel: string, code: string, dbColumn = ""): string {
  const varToken = toAsciiLower(`${dbColumn} ${varLabel}`);
  const codeToken = toAsciiLower(code);
  if (!codeToken) return "";
  if (dbColumn === "M_PLEC" || varToken.includes("plec")) {
    if (codeToken.includes("kobiet")) return "👩";
    if (codeToken.includes("mezczyzn")) return "👨";
  }
  if (dbColumn === "M_WIEK" || varToken.includes("wiek")) {
    if (/\b60\b/.test(codeToken)) return "🧓";
    if (/40\D*59/.test(codeToken)) return "🧑‍💼";
    if (/15\D*39/.test(codeToken)) return "🧑";
  }
  if (dbColumn === "M_WYKSZT" || varToken.includes("wykszt")) {
    if (codeToken.includes("wyzsze")) return "🎓";
    if (codeToken.includes("srednie")) return "📘";
    if (["podstaw", "gimnaz", "zawod"].some((k) => codeToken.includes(k))) return "🛠️";
  }
  if (dbColumn === "M_ZAWOD" || varToken.includes("zawod")) {
    if (codeToken.includes("umysl")) return "🧠";
    if (codeToken.includes("fizycz")) return "🛠️";
    if (codeToken.includes("wlasn") && codeToken.includes("firm")) return "🏢";
    if (codeToken.includes("student") || codeToken.includes("uczen")) return "🧑‍🎓";
    if (codeToken.includes("bezrobot")) return "🔎";
    if (codeToken.includes("renc") || codeToken.includes("emery")) return "🌿";
    if (codeToken.includes("inna")) return "🧩";
  }
  if (dbColumn === "M_MATERIAL" || varToken.includes("material")) {
    if (codeToken.includes("odmaw")) return "🤐";
    if (codeToken.includes("bardzo dobra") || codeToken.includes("bardzo dobrze")) return "😄";
    if (codeToken.includes("raczej dobra") || codeToken.includes("raczej dobrze")) return "🙂";
    if (codeToken.includes("przeciet") || codeToken.includes("srednio")) return "😐";
    if (codeToken.includes("raczej zla") || codeToken.includes("raczej zle")) return "🙁";
    if (codeToken.includes("bardzo zla") || codeToken.includes("bardzo zle")) return "😟";
  }
  if (["obszar", "miejsce", "zamiesz", "lokaliz", "wies", "miasto"].some((k) => varToken.includes(k))) {
    if (codeToken.includes("miasto")) return "🏬";
    if (codeToken.includes("wies")) return "🌾";
    return "📍";
  }
  if (["preferencj", "komitet", "wybor", "glos", "parti", "sejm"].some((k) => varToken.includes(k))) {
    if (codeToken.includes("odmow")) return "🤐";
    if (codeToken.includes("nie wiem") || codeToken.includes("niezdecyd") || codeToken.includes("trudno")) return "❓";
    return "🗳️";
  }
  return "";
}

function normalizeAliases(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return [...fallback];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const txt = safeText(item);
    const key = txt.toLowerCase();
    if (!txt || seen.has(key)) continue;
    seen.add(key);
    out.push(txt);
  }
  return out.length ? out : [...fallback];
}

function canonicalCoreCode(field: string, rawCode: string, rawLabel: string): string {
  const fieldKey = safeText(field).toUpperCase();
  const source = safeText(rawCode) || safeText(rawLabel);
  if (!source) return "";
  const token = toAsciiLower(source);
  if (fieldKey === "M_PLEC") {
    if (token.includes("kobiet")) return "kobieta";
    if (token.includes("mezczyzn")) return "mężczyzna";
  } else if (fieldKey === "M_WIEK") {
    if (/15\D*39/.test(token)) return "15-39";
    if (/40\D*59/.test(token)) return "40-59";
    if (token.includes("60")) return "60+";
  } else if (fieldKey === "M_WYKSZT") {
    if (token.includes("wyzsze")) return "wyższe";
    if (token.includes("srednie")) return "średnie";
    if (["podstaw", "gimnaz", "zawod", "podst./gim./zaw"].some((k) => token.includes(k))) return "podst./gim./zaw.";
  } else if (fieldKey === "M_ZAWOD") {
    if (token.includes("umysl")) return "prac. umysłowy";
    if (token.includes("fizycz")) return "prac. fizyczny";
    if (token.includes("wlasn") && token.includes("firm")) return "własna firma";
    if (token.includes("student") || token.includes("uczen")) return "student/uczeń";
    if (token.includes("bezrobot")) return "bezrobotny";
    if (token.includes("renc") || token.includes("emery")) return "rencista/emeryt";
    if (token.includes("inna") || token.includes("jaka")) return "inna";
  } else if (fieldKey === "M_MATERIAL") {
    if (token.includes("odmaw")) return "odmowa";
    if (token.includes("bardzo dobrze") || token.includes("bardzo dobra")) return "bardzo dobra";
    if (token.includes("raczej dobrze") || token.includes("raczej dobra")) return "raczej dobra";
    if (token.includes("przeciet") || token.includes("srednio")) return "przeciętna";
    if (token.includes("raczej zle") || token.includes("raczej zla")) return "raczej zła";
    if (token.includes("bardzo zle") || token.includes("bardzo zla") || token.includes("ciezk")) return "bardzo zła";
  }
  return source;
}

function normalizeOptions(
  raw: unknown,
  fallback: MetryczkaOption[],
  forceCodeEqualsLabel = false,
  coreField = "",
): MetryczkaOption[] {
  if (!Array.isArray(raw)) {
    return fallback.map((opt) => ({ ...opt }));
  }
  const out: MetryczkaOption[] = [];
  const seenCodes = new Set<string>();
  const seenLabels = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const label = safeText((item as Record<string, unknown>).label);
    const codeSrc = safeText((item as Record<string, unknown>).code);
    const code = forceCodeEqualsLabel
      ? canonicalCoreCode(coreField, codeSrc, label)
      : codeSrc;
    const isOpen =
      safeBool((item as Record<string, unknown>).is_open, false)
      || toAsciiLower(label) === toAsciiLower(M_ZAWOD_OTHER_KEY);
    const lockRandomization = safeBool((item as Record<string, unknown>).lock_randomization, false);
    const valueEmoji = safeText((item as Record<string, unknown>).value_emoji);
    if (!label || !code) continue;
    if (seenCodes.has(code)) continue;
    const lKey = label.toLowerCase();
    if (seenLabels.has(lKey)) continue;
    seenCodes.add(code);
    seenLabels.add(lKey);
    out.push({ label, code, is_open: isOpen, lock_randomization: lockRandomization, value_emoji: valueEmoji });
  }
  return out.length
    ? out
    : fallback.map((opt) => ({
      ...opt,
      is_open: !!opt.is_open,
      lock_randomization: !!opt.lock_randomization,
      value_emoji: safeText(opt.value_emoji),
    }));
}

function applyLegacyExcludeLastLock(
  options: MetryczkaOption[],
  randomizeOptions: boolean,
  legacyExcludeLast: boolean,
): MetryczkaOption[] {
  const out = options.map((opt) => ({ ...opt, lock_randomization: !!opt.lock_randomization }));
  if (!out.length) return out;
  const hasLocked = out.some((opt) => opt.lock_randomization === true);
  if (randomizeOptions && legacyExcludeLast && !hasLocked) {
    out[out.length - 1] = { ...out[out.length - 1], lock_randomization: true };
  }
  return out;
}

function normalizeCoreQuestion(
  source: Record<string, unknown> | null | undefined,
  fallback: MetryczkaQuestion,
): MetryczkaQuestion {
  const prompt = safeText(source?.prompt) || fallback.prompt;
  const tableLabel = safeText(source?.table_label) || fallback.table_label || prompt;
  const variableEmoji = safeText(source?.variable_emoji) || safeText(fallback.variable_emoji) || guessVariableEmoji(fallback.db_column, tableLabel, prompt);
  const aliases = normalizeAliases(source?.aliases, fallback.aliases);
  const randomizeOptions = safeBool(source?.randomize_options, false);
  const legacyExcludeLast = safeBool(source?.randomize_exclude_last, false);
  const options = applyLegacyExcludeLastLock(
    normalizeOptions(source?.options, fallback.options, true, fallback.db_column),
    randomizeOptions,
    legacyExcludeLast,
  );
  return {
    ...fallback,
    prompt,
    table_label: tableLabel,
    variable_emoji: variableEmoji,
    aliases,
    options: options.map((opt) => ({
      ...opt,
      value_emoji: safeText(opt.value_emoji) || guessValueEmoji(tableLabel, String(opt.code || opt.label || ""), fallback.db_column),
    })),
    required: true,
    multiple: false,
    randomize_options: randomizeOptions,
    randomize_exclude_last: false,
  };
}

function normalizeCustomQuestion(raw: unknown, usedColumns: Set<string>): MetryczkaQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  let id = safeText(src.id).toUpperCase();
  let dbColumn = safeText(src.db_column).toUpperCase();
  if (!id && dbColumn) id = dbColumn;
  if (!dbColumn && id) dbColumn = id;
  if (!SAFE_ID_RE.test(id) || !SAFE_ID_RE.test(dbColumn)) return null;
  if (CORE_ORDER.includes(id as (typeof CORE_ORDER)[number])) return null;
  if (CORE_ORDER.includes(dbColumn as (typeof CORE_ORDER)[number])) return null;
  if (usedColumns.has(dbColumn)) return null;

  const prompt = safeText(src.prompt);
  if (!prompt) return null;
  const tableLabel = safeText(src.table_label) || prompt;
  const variableEmoji = safeText(src.variable_emoji) || guessVariableEmoji(dbColumn, tableLabel, prompt);

  const randomizeOptions = safeBool(src.randomize_options, false);
  const legacyExcludeLast = safeBool(src.randomize_exclude_last, false);
  const options = applyLegacyExcludeLastLock(
    normalizeOptions(src.options, []),
    randomizeOptions,
    legacyExcludeLast,
  ).map((opt) => ({
    ...opt,
    value_emoji: safeText(opt.value_emoji) || guessValueEmoji(tableLabel, String(opt.code || opt.label || ""), dbColumn),
  }));
  if (!options.length) return null;

  usedColumns.add(dbColumn);
  return {
    id,
    scope: "custom",
    db_column: dbColumn,
    prompt,
    table_label: tableLabel,
    variable_emoji: variableEmoji,
    required: safeBool(src.required, true),
    multiple: safeBool(src.multiple, false),
    randomize_options: randomizeOptions,
    randomize_exclude_last: false,
    aliases: normalizeAliases(src.aliases, []),
    options,
  };
}

export function normalizeMetryczkaConfig(raw: unknown): MetryczkaConfig {
  const baseDefaults = deepClone(CORE_DEFAULTS);
  if (!raw || typeof raw !== "object") {
    return {
      version: 1,
      enabled: true,
      questions: CORE_ORDER.map((id) => deepClone(baseDefaults[id])),
    };
  }

  const src = raw as Record<string, unknown>;
  const versionRaw = Number.parseInt(String(src.version ?? "1"), 10);
  const version = Number.isFinite(versionRaw) && versionRaw > 0 ? versionRaw : 1;
  const enabled = safeBool(src.enabled, true);

  const rawQuestions = Array.isArray(src.questions) ? src.questions : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const item of rawQuestions) {
    if (!item || typeof item !== "object") continue;
    const id = safeText((item as Record<string, unknown>).id).toUpperCase();
    if (!id) continue;
    byId.set(id, item as Record<string, unknown>);
  }

  const questions: MetryczkaQuestion[] = [];
  const usedColumns = new Set<string>();
  for (const coreId of CORE_ORDER) {
    const fallback = baseDefaults[coreId];
    const normalized = normalizeCoreQuestion(byId.get(coreId), fallback);
    questions.push(normalized);
    usedColumns.add(normalized.db_column);
  }

  for (const item of rawQuestions) {
    const custom = normalizeCustomQuestion(item, usedColumns);
    if (custom) questions.push(custom);
  }

  return { version, enabled, questions };
}

export function initMetryAnswers(
  questions: MetryczkaQuestion[],
  current: Record<string, string> = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of questions) {
    out[q.id] = safeText(current[q.id]);
  }
  return out;
}

export function findMetryQuestionByColumn(questions: MetryczkaQuestion[], dbColumn: string): MetryczkaQuestion | null {
  const needle = safeText(dbColumn).toUpperCase();
  return questions.find((q) => safeText(q.db_column).toUpperCase() === needle) || null;
}

export function findSelectedOptionLabel(question: MetryczkaQuestion | null, selectedCode: string): string {
  if (!question) return "";
  const code = safeText(selectedCode);
  const found = question.options.find((opt) => safeText(opt.code) === code);
  return found?.label || code;
}

function toAsciiLower(value: string): string {
  return value
    .toLowerCase()
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ż/g, "z")
    .replace(/ź/g, "z")
    .trim();
}

export function isMZawodOtherSelected(question: MetryczkaQuestion | null, selectedCode: string): boolean {
  if (!question) return false;
  if (isOpenOptionSelected(question, selectedCode)) return true;
  const isMZawod = safeText(question.db_column).toUpperCase() === "M_ZAWOD" || safeText(question.id).toUpperCase() === "M_ZAWOD";
  if (!isMZawod) return false;
  const label = findSelectedOptionLabel(question, selectedCode);
  return toAsciiLower(label) === toAsciiLower(M_ZAWOD_OTHER_KEY);
}

export function isOpenOptionSelected(question: MetryczkaQuestion | null, selectedCode: string): boolean {
  if (!question) return false;
  const code = safeText(selectedCode);
  if (!code) return false;
  const found = question.options.find((opt) => safeText(opt.code) === code);
  return !!found?.is_open;
}

export function buildMetryPayload(questions: MetryczkaQuestion[], answers: Record<string, string>): Record<string, string> {
  const payload: Record<string, string> = {};
  for (const q of questions) {
    const col = safeText(q.db_column).toUpperCase() || safeText(q.id).toUpperCase();
    if (!col) continue;
    payload[col] = safeText(answers[q.id]);
  }
  return payload;
}

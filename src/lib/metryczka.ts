export type MetryczkaScope = "core" | "custom";

export type MetryczkaOption = {
  label: string;
  code: string;
  is_open: boolean;
  lock_randomization?: boolean;
};

export type MetryczkaQuestion = {
  id: string;
  scope: MetryczkaScope;
  db_column: string;
  prompt: string;
  table_label: string;
  required: boolean;
  multiple: boolean;
  randomize_options: boolean;
  randomize_exclude_last: boolean;
  aliases: string[];
  options: MetryczkaOption[];
};

export type MetryczkaConfig = {
  version: number;
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
    required: true,
    multiple: false,
    randomize_options: false,
    randomize_exclude_last: false,
    aliases: ["M_PLEC", "Płeć", "Plec"],
    options: [
      { label: "kobieta", code: "kobieta", is_open: false },
      { label: "mężczyzna", code: "mężczyzna", is_open: false },
    ],
  },
  M_WIEK: {
    id: "M_WIEK",
    scope: "core",
    db_column: "M_WIEK",
    prompt: "Jaki jest Pana/Pani wiek?",
    table_label: "Wiek",
    required: true,
    multiple: false,
    randomize_options: false,
    randomize_exclude_last: false,
    aliases: ["M_WIEK", "Wiek"],
    options: [
      { label: "15-39", code: "15-39", is_open: false },
      { label: "40-59", code: "40-59", is_open: false },
      { label: "60 i więcej", code: "60 i więcej", is_open: false },
    ],
  },
  M_WYKSZT: {
    id: "M_WYKSZT",
    scope: "core",
    db_column: "M_WYKSZT",
    prompt: "Jakie ma Pan/Pani wykształcenie?",
    table_label: "Wykształcenie",
    required: true,
    multiple: false,
    randomize_options: false,
    randomize_exclude_last: false,
    aliases: ["M_WYKSZT", "Wykształcenie", "Wyksztalcenie"],
    options: [
      {
        label: "podstawowe, gimnazjalne, zasadnicze zawodowe",
        code: "podstawowe, gimnazjalne, zasadnicze zawodowe",
        is_open: false,
      },
      { label: "średnie", code: "średnie", is_open: false },
      { label: "wyższe", code: "wyższe", is_open: false },
    ],
  },
  M_ZAWOD: {
    id: "M_ZAWOD",
    scope: "core",
    db_column: "M_ZAWOD",
    prompt: "Jaka jest Pana/Pani sytuacja zawodowa?",
    table_label: "Status zawodowy",
    required: true,
    multiple: false,
    randomize_options: false,
    randomize_exclude_last: false,
    aliases: ["M_ZAWOD", "Status zawodowy", "Sytuacja zawodowa"],
    options: [
      { label: "pracownik umysłowy", code: "pracownik umysłowy", is_open: false },
      { label: "pracownik fizyczny", code: "pracownik fizyczny", is_open: false },
      { label: "prowadzę własną firmę", code: "prowadzę własną firmę", is_open: false },
      { label: "student/uczeń", code: "student/uczeń", is_open: false },
      { label: "bezrobotny", code: "bezrobotny", is_open: false },
      { label: "rencista/emeryt", code: "rencista/emeryt", is_open: false },
      { label: "inna (jaka?)", code: "inna (jaka?)", is_open: true },
    ],
  },
  M_MATERIAL: {
    id: "M_MATERIAL",
    scope: "core",
    db_column: "M_MATERIAL",
    prompt: "Jak ocenia Pan/Pani własną sytuację materialną?",
    table_label: "Sytuacja materialna",
    required: true,
    multiple: false,
    randomize_options: false,
    randomize_exclude_last: false,
    aliases: ["M_MATERIAL", "Sytuacja materialna"],
    options: [
      {
        label: "powodzi mi się bardzo źle, jestem w ciężkiej sytuacji materialnej",
        code: "powodzi mi się bardzo źle, jestem w ciężkiej sytuacji materialnej",
        is_open: false,
      },
      { label: "powodzi mi się raczej źle", code: "powodzi mi się raczej źle", is_open: false },
      { label: "powodzi mi się przeciętnie, średnio", code: "powodzi mi się przeciętnie, średnio", is_open: false },
      { label: "powodzi mi się raczej dobrze", code: "powodzi mi się raczej dobrze", is_open: false },
      { label: "powodzi mi się bardzo dobrze", code: "powodzi mi się bardzo dobrze", is_open: false },
      { label: "odmawiam udzielenia odpowiedzi", code: "odmawiam udzielenia odpowiedzi", is_open: false },
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

function normalizeOptions(raw: unknown, fallback: MetryczkaOption[], forceCodeEqualsLabel = false): MetryczkaOption[] {
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
    const code = forceCodeEqualsLabel ? label : codeSrc;
    const isOpen =
      safeBool((item as Record<string, unknown>).is_open, false)
      || toAsciiLower(label) === toAsciiLower(M_ZAWOD_OTHER_KEY);
    const lockRandomization = safeBool((item as Record<string, unknown>).lock_randomization, false);
    if (!label || !code) continue;
    if (seenCodes.has(code)) continue;
    const lKey = label.toLowerCase();
    if (seenLabels.has(lKey)) continue;
    seenCodes.add(code);
    seenLabels.add(lKey);
    out.push({ label, code, is_open: isOpen, lock_randomization: lockRandomization });
  }
  return out.length
    ? out
    : fallback.map((opt) => ({ ...opt, is_open: !!opt.is_open, lock_randomization: !!opt.lock_randomization }));
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
  const aliases = normalizeAliases(source?.aliases, fallback.aliases);
  const randomizeOptions = safeBool(source?.randomize_options, false);
  const legacyExcludeLast = safeBool(source?.randomize_exclude_last, false);
  const options = applyLegacyExcludeLastLock(
    normalizeOptions(source?.options, fallback.options, true),
    randomizeOptions,
    legacyExcludeLast,
  );
  return {
    ...fallback,
    prompt,
    table_label: tableLabel,
    aliases,
    options,
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

  const randomizeOptions = safeBool(src.randomize_options, false);
  const legacyExcludeLast = safeBool(src.randomize_exclude_last, false);
  const options = applyLegacyExcludeLastLock(
    normalizeOptions(src.options, []),
    randomizeOptions,
    legacyExcludeLast,
  );
  if (!options.length) return null;

  usedColumns.add(dbColumn);
  return {
    id,
    scope: "custom",
    db_column: dbColumn,
    prompt,
    table_label: tableLabel,
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
      questions: CORE_ORDER.map((id) => deepClone(baseDefaults[id])),
    };
  }

  const src = raw as Record<string, unknown>;
  const versionRaw = Number.parseInt(String(src.version ?? "1"), 10);
  const version = Number.isFinite(versionRaw) && versionRaw > 0 ? versionRaw : 1;

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

  return { version, questions };
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

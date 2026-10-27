// @ts-check

// The page's behavior: the sort-off (sortoff.js), the playground, the code
// tabs, library sizes, and dev mode. Ordable comes from Temper's JS output
// through the import map.

import * as ordable from "ordable";
import { initDevMode } from "./devmode.js";
import { initSortOff } from "./sortoff.js";

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

initSortOff();

// Playground: runs the visitor's own code in their browser, with
// console.log sent to the page.

const PLAY_START = `// Numbers compare by value, at any length.
const files = ["img12.png", "img10.png", "IMG2.png", "img1.png"];
console.log(sortNatural(files));

// Options: grouping by case puts every img before every IMG.
const grouped = Order.new({ groupByCase: true });
console.log(grouped.sort(files));

// Negative: the first comes first. 0 only for the same string.
console.log(compareNatural("v1.9", "v1.10"));
console.log(compareNatural("1", "01"));

// Sort anything by a string from each.
const songs = [{ title: "Track 10" }, { title: "Track 9" }];
console.log(sortNaturalByKey(songs, (song) => song.title));

// Keys that sort with plain comparison, as in a database.
console.log(naturalKey("file2") < naturalKey("file10"));
`;

const playCode = /** @type {HTMLTextAreaElement} */ ($("play-code"));
const playOutput = $("play-output");
const playHighlight = $("play-highlight");
playCode.value = PLAY_START;

// Redraws the highlighted copy behind the textarea, and keeps it scrolled
// the same. A trailing newline needs a space after it to be drawn.
function syncHighlight() {
  /** @type {HTMLElement} */ (playHighlight.firstChild).innerHTML = highlight(playCode.value + " ", "//");
  playHighlight.scrollTop = playCode.scrollTop;
  playHighlight.scrollLeft = playCode.scrollLeft;
}
// Grows the editor to fit its code, so it doesn't scroll up and down.
function fitEditor() {
  playCode.style.height = "auto";
  playCode.style.height = `${playCode.scrollHeight + 2}px`;
}
playCode.addEventListener("input", () => {
  fitEditor();
  syncHighlight();
});
playCode.addEventListener("scroll", syncHighlight);

/**
 * Logged values as the console would show them: strings as they are, and
 * lists and objects as JSON.
 *
 * @param {unknown} value
 */
function show(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      // Cycles and such: fall through.
    }
  }
  return String(value);
}

/** @param {string} text @param {boolean} [isError] */
function showOutput(text, isError = false) {
  const line = document.createElement("div");
  if (isError) line.className = "error";
  line.textContent = text;
  playOutput.append(line);
}

// Runs code as the body of an async function, given Ordable's functions and
// a console that writes to `log`. Visitors run their own code in their own
// browser; the page shares nothing with it but these.
const AsyncFunction = /** @type {FunctionConstructor} */ ((async () => {}).constructor);
const API = Object.entries(ordable);

/**
 * @param {string} code
 * @param {(...args: unknown[]) => void} log
 */
async function runCode(code, log) {
  const console = { log, error: log, warn: log, info: log };
  const run = new AsyncFunction(...API.map(([name]) => name), "console", code);
  await run(...API.map(([, value]) => value), console);
}

async function runPlay() {
  playOutput.replaceChildren();
  try {
    await runCode(playCode.value, (...args) => showOutput(args.map(show).join(" ")));
  } catch (error) {
    showOutput(String(error), true);
  }
}

$("play-run").addEventListener("click", runPlay);
playCode.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    runPlay();
  }
});
runPlay();

// Code tabs: each language's tour, with a small highlighter.

/** Name, tour file extension, run command, line comment. */
const LANGUAGES = [
  ["C++", "cpp", "cmake -B build && cmake --build build && ./build/tour", "//"],
  ["C#", "cs", "dotnet run", "//"],
  ["Java", "java", "./gradlew run", "//"],
  ["JavaScript", "js", "npm ci && npm start", "//"],
  ["Lua", "lua", "lua -l paths tour.lua", "--"],
  ["Python", "py", "uv run tour.py", "#"],
  ["Rust", "rs", "cargo run", "//"],
];
// Python is well known, and JavaScript already has the playground above.
const DEFAULT_LANGUAGE = "py";

const KEYWORDS = new Set(
  ("and as async auto await bool break case catch class const continue def do double else elif end except export " +
    "false fn for foreach from function if import in int let local match mut new None nil not null " +
    "of or private public record return self static string struct template then this throw true True False try " +
    "type typename typeof use using var void while")
    .split(" "),
);

/** @param {string} s */
function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}

/**
 * Source as HTML, with comments, strings, numbers, keywords, and type-like
 * names in spans.
 *
 * @param {string} source
 * @param {string} comment
 */
function highlight(source, comment) {
  const commentPattern = comment === "#" ? "#[^\\n]*" : comment === "--" ? "--[^\\n]*" : "//[^\\n]*|/\\*[\\s\\S]*?\\*/";
  const token = new RegExp(
    `(${commentPattern})|("""[\\s\\S]*?"""|'''[\\s\\S]*?'''|"(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'|\`[^\`]*\`)|` +
      `\\b(0x[0-9a-fA-F]+|\\d+(?:\\.\\d+)?)\\b|([A-Za-z_]\\w*)`,
    "g",
  );
  let out = "";
  let last = 0;
  for (const m of source.matchAll(token)) {
    out += escapeHtml(source.slice(last, m.index));
    const [text, isComment, isString, isNumber, word] = m;
    const cls = isComment
      ? "comment"
      : isString
        ? "string"
        : isNumber
          ? "number"
          : KEYWORDS.has(word)
            ? "keyword"
            : /^[A-Z][a-z]/.test(word)
              ? "type"
              : null;
    out += cls ? `<span class="tok-${cls}">${escapeHtml(text)}</span>` : escapeHtml(text);
    last = (m.index ?? 0) + text.length;
  }
  return out + escapeHtml(source.slice(last));
}

const tabs = /** @type {HTMLElement} */ (document.querySelector("#code .tabs"));
/** @type {Map<string, string>} */
const sources = new Map();
/** @type {string | null} */
let selectedTour = null;
// Dev mode follows the chosen language; set up below.
/** @type {{ setLanguage: (file: string) => void } | null} */
let devMode = null;

/** @param {number} index */
async function selectTab(index) {
  const [name, file, run, comment] = LANGUAGES[index];
  for (const [i, button] of [...tabs.children].entries()) {
    button.setAttribute("aria-selected", String(i === index));
    /** @type {HTMLElement} */ (button).tabIndex = i === index ? 0 : -1;
  }
  $("run-command").textContent = run;
  $("source-label").textContent = `Read-only example: ${name}`;
  if (!sources.has(file)) {
    const response = await fetch(`tour/tour.${file}`, { cache: "no-cache" });
    sources.set(file, response.ok ? await response.text() : "// Couldn't load this tour.");
  }
  $("source").innerHTML = highlight(sources.get(file) ?? "", comment);
  selectedTour = file;
  devMode?.setLanguage(file);
  /** @type {HTMLButtonElement} */ ($("tour-run")).disabled = file !== "js";
  $("tour-output").hidden = true;
  $("tour-run-note").textContent =
    file === "js"
      ? "Runs as JavaScript in this page."
      : "Only JavaScript runs in this page. Every language runs in CI; run this one locally with the command above.";
}

// The JavaScript tour runs as the body of a function, with console.log
// sent to the page.
async function runJsTour() {
  // The tour's import names what runCode passes in.
  const code = (sources.get("js") ?? "").replace(/^import \{[^}]*\} from "ordable";$/m, "");
  /** @type {string[]} */
  const lines = [];
  await runCode(code, (...args) => lines.push(args.map(show).join(" ")));
  return lines.map((line) => line + "\n").join("");
}

$("tour-run").addEventListener("click", async () => {
  if (selectedTour !== "js") return;
  const output = $("tour-output");
  const note = $("tour-run-note");
  output.hidden = false;
  output.textContent = "Running…";
  try {
    const out = await runJsTour();
    output.textContent = out;
    // TOUR_EXPECTED is the tours' shared output, which CI checks in every
    // language.
    note.textContent =
      out === TOUR_EXPECTED ? "✓ The same output as every other language." : "The output differs from the other languages.";
  } catch (error) {
    output.textContent = String(error);
    note.textContent = "";
  }
});

for (const [i, [name]] of LANGUAGES.entries()) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "tab");
  button.textContent = name;
  button.addEventListener("click", () => selectTab(i));
  button.addEventListener("keydown", (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (step) {
      const next = (i + step + LANGUAGES.length) % LANGUAGES.length;
      selectTab(next);
      /** @type {HTMLElement} */ (tabs.children[next]).focus();
    }
  });
  tabs.append(button);
}

// Library sizes, measured when the site was built.

fetch("sizes.json", { cache: "no-cache" })
  .then((response) => response.json())
  .then((/** @type {{ name: string, raw: number, gzip: number }[]} */ sizes) => {
    const kb = (/** @type {number} */ n) => `${(n / 1024).toFixed(1)} KB`;
    const items = sizes.map(({ name, raw, gzip }) => `<li>${escapeHtml(name)}: ${kb(raw)}, or ${kb(gzip)} gzipped</li>`);
    $("sizes").innerHTML = items.join("");
  })
  .catch(() => {});

// Dev mode shows the code behind each part of the page, in the code tabs'
// language, and can open the full tour.
devMode = initDevMode({
  toggle: /** @type {HTMLButtonElement} */ ($("dev-toggle")),
  languages: LANGUAGES.map(([name, file, , comment]) => ({ name, file, comment })),
  language: DEFAULT_LANGUAGE,
  highlight,
  showTour: (file) => {
    selectTab(LANGUAGES.findIndex(([, f]) => f === file));
    $("code").scrollIntoView({ behavior: "smooth" });
  },
});

// Start up, once everything above is defined.
selectTab(LANGUAGES.findIndex(([, file]) => file === DEFAULT_LANGUAGE));
fitEditor();
syncHighlight();

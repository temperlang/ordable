// @ts-check

// Dev mode: a switch that shows the Ordable code behind each part of the
// page, in any of its languages. Badges sit over the page, and each opens a
// card with a short snippet.
//
// Snippets come from the tours: build.py collects lines marked
// `snippet: <name>` into snippets.json, and CI runs every tour, so each
// snippet is code that runs.

/**
 * A part of the page with code behind it. `id` names its snippet.
 * @typedef {{ id: string, title: string, about: string, target: () => Element | null | undefined }} Spot
 *
 * In `about`, names in backticks are Ordable's, as JavaScript spells them;
 * the card spells them as the chosen language does.
 */

/**
 * A language of the tours: its name, the tour file's extension, and its
 * line comment.
 * @typedef {{ name: string, file: string, comment: string }} Language
 */

/** @param {string} selector */
const find = (selector) => document.querySelector(selector);

/** @type {Spot[]} */
const SPOTS = [
  {
    id: "sort",
    title: "Sorting strings",
    about: "`sortNatural` gives a sorted copy of a list of strings, with numbers compared by value.",
    target: () => find(".hero-demo"),
  },
  {
    id: "numbers",
    title: "Numbers of any length",
    about: "Runs of digits compare as numbers, however long, without overflow, so v1.9 comes before v1.10.",
    // The Versions list, where that shows most.
    target: () => [...document.querySelectorAll("#samples button")].find((b) => b.textContent === "Versions"),
  },
  {
    id: "options",
    title: "Options",
    about: "By default, case only breaks ties, lowercase first. An `Order` with options changes that: `ignoreCase`, so case never counts; `groupByCase`, so case counts before the letter, as in plain sorting; and `upperFirst`, for uppercase first wherever case counts.",
    target: () => find("#case-levels"),
  },
  {
    id: "equal",
    title: "Equal strings",
    about: "`ignoreAccents` and `ignoreCase` let different strings be equal, so Café equals CAFE, with equal keys, for matching or a unique index in a database. Equal strings keep their input order when sorting.",
    target: () => find("#switch-ignoreAccents"),
  },
  {
    id: "ties",
    title: "One answer, whatever the input order",
    about: "By default, `compareNatural` gives 0 only for the same string, so a list always sorts the same way, whatever its order, as shuffling shows. Leading zeros, digit scripts, accents, and case only break ties, so 1 comes before 01.",
    // Ordable's "No ties, ever", the claim the shuffle tests.
    target: () => find("#ordable-stat"),
  },
  {
    id: "by-key",
    title: "Sorting your own types",
    about: "`sortNaturalByKey` sorts any items by a string from each. This column sorts its rows by their text this way.",
    target: () => find("#rows-ordable"),
  },
  {
    id: "keys",
    title: "Natural keys",
    about: "`naturalKey` gives a string that sorts by plain comparison exactly as its source sorts naturally, the same in every language.",
    target: () => find("#key-a"),
  },
  {
    id: "compare",
    title: "Comparing two strings",
    about: "`compareNatural` returns a negative number if the first comes first, positive if the second does, and 0 only for the same string.",
    target: () => find("#key-check"),
  },
];

/**
 * An Ordable name, like `sortNatural`, as `file`'s language spells it:
 * snake_case in Python and Rust, and PascalCase in C#.
 *
 * @param {string} name
 * @param {string} file
 * @returns {string}
 */
function spell(name, file) {
  if (file === "py" || file === "rs") return name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  if (file === "cs") return name[0].toUpperCase() + name.slice(1);
  return name;
}

/** @param {string} s */
const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);

// Phones get the card as a sheet along the bottom instead.
const narrow = matchMedia("(max-width: 640px)");

/**
 * Sets up dev mode.
 *
 * @param {{
 *   toggle: HTMLButtonElement,
 *   languages: Language[],
 *   language: string,
 *   highlight: (code: string, comment: string) => string,
 *   showTour: (file: string) => void,
 * }} options
 * @returns {{ setLanguage: (file: string) => void }}
 */
export function initDevMode({ toggle, languages, language, highlight, showTour }) {
  /** @type {Record<string, Record<string, string>> | null} */
  let snippets = null;
  /** @type {Spot | null} */
  let open = null;
  let frame = 0;

  const layer = document.createElement("div");
  layer.className = "dev-layer";
  layer.hidden = true;
  const badges = new Map(
    SPOTS.map((spot) => {
      const badge = document.createElement("button");
      badge.type = "button";
      badge.className = "dev-badge";
      badge.textContent = "</>";
      badge.setAttribute("aria-label", `Code: ${spot.title}`);
      badge.setAttribute("aria-expanded", "false");
      badge.setAttribute("aria-controls", "dev-card");
      badge.addEventListener("click", () => (open === spot ? close() : show(spot)));
      layer.append(badge);
      return [spot, badge];
    }),
  );

  const card = document.createElement("div");
  card.id = "dev-card";
  card.className = "dev-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-labelledby", "dev-card-title");
  card.tabIndex = -1;
  card.hidden = true;
  card.innerHTML = `
    <div class="dev-card-head">
      <h3 id="dev-card-title"></h3>
      <button type="button" class="dev-close" aria-label="Close">×</button>
    </div>
    <p class="dev-about"></p>
    <div class="dev-languages" role="group" aria-label="Language"></div>
    <pre class="dev-code"><code></code></pre>
    <p class="dev-foot"><span>From the <span class="dev-lang"></span> tour, which runs in CI.</span>
      <button type="button" class="dev-tour">See it in the full tour</button></p>`;
  const $ = (/** @type {string} */ selector) => /** @type {HTMLElement} */ (card.querySelector(selector));
  for (const { name, file } of languages) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = name;
    chip.dataset.file = file;
    chip.addEventListener("click", () => setLanguage(file));
    $(".dev-languages").append(chip);
  }
  $(".dev-close").addEventListener("click", () => close());
  $(".dev-tour").addEventListener("click", () => {
    close(false);
    showTour(language);
  });
  document.body.append(layer, card);

  /** Fills the card with the open spot's snippet in the chosen language. */
  function render() {
    if (!open) return;
    const lang = languages.find((l) => l.file === language) ?? languages[0];
    $("#dev-card-title").textContent = open.title;
    $(".dev-about").innerHTML = escapeHtml(open.about).replace(/`([^`]+)`/g, (_, name) => `<code>${spell(name, lang.file)}</code>`);
    $(".dev-lang").textContent = lang.name;
    for (const chip of $(".dev-languages").children) {
      chip.setAttribute("aria-pressed", String(/** @type {HTMLElement} */ (chip).dataset.file === lang.file));
    }
    const code = snippets?.[open.id]?.[lang.file];
    $(".dev-code code").innerHTML = code
      ? highlight(code, lang.comment)
      : snippets
        ? "This snippet is missing."
        : "Loading…";
  }

  /** @param {Spot} spot */
  async function show(spot) {
    if (open) badges.get(open)?.setAttribute("aria-expanded", "false");
    open = spot;
    badges.get(spot)?.setAttribute("aria-expanded", "true");
    card.hidden = false;
    render();
    place();
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function close(refocus = true) {
    if (!open) return;
    const badge = badges.get(open);
    badge?.setAttribute("aria-expanded", "false");
    open = null;
    card.hidden = true;
    if (refocus) badge?.focus({ preventScroll: true });
  }

  /** @param {string} file */
  function setLanguage(file) {
    if (!languages.some((l) => l.file === file)) return;
    language = file;
    render();
    // The card's height may change with the language.
    place();
  }

  // Badges go at their parts' top right corners, in page coordinates, so
  // they scroll with the page; layout changes move them.
  function place() {
    frame = 0;
    if (layer.hidden) return;
    const width = document.documentElement.clientWidth;
    for (const [spot, badge] of badges) {
      const target = spot.target();
      const rect = target?.getBoundingClientRect();
      const shown = !!rect && rect.width > 0 && rect.height > 0;
      badge.hidden = !shown;
      if (!shown || !rect) continue;
      badge.style.left = `${Math.min(rect.right - 14, width - 40) + scrollX}px`;
      badge.style.top = `${rect.top - 14 + scrollY}px`;
    }
    if (!open) return;
    const badge = badges.get(open);
    if (!badge || badge.hidden) return close(false);
    if (narrow.matches) {
      card.style.left = card.style.top = "";
      return;
    }
    // Below the badge if it fits on screen, else above it.
    const b = badge.getBoundingClientRect();
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const below = b.bottom + 10 + h <= innerHeight || b.top - 10 - h < 0;
    card.style.left = `${Math.max(16, Math.min(b.right - w + 12, width - w - 16)) + scrollX}px`;
    card.style.top = `${(below ? b.bottom + 10 : b.top - 10 - h) + scrollY}px`;
  }
  const schedule = () => {
    if (!frame && !layer.hidden) frame = requestAnimationFrame(place);
  };

  addEventListener("resize", schedule);
  new ResizeObserver(schedule).observe(document.body);
  // Clicks and input can show, hide, or move parts, like the tabs do.
  document.addEventListener("click", schedule, true);
  document.addEventListener("input", schedule, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) close();
  });
  document.addEventListener("pointerdown", (event) => {
    const t = /** @type {Node} */ (event.target);
    if (open && !card.contains(t) && !layer.contains(t)) close(false);
  });

  toggle.addEventListener("click", async () => {
    const on = toggle.getAttribute("aria-pressed") !== "true";
    toggle.setAttribute("aria-pressed", String(on));
    toggle.querySelector(".dev-label").textContent = on ? "Hide the code" : "Show the code";
    layer.hidden = !on;
    if (!on) return close(false);
    place();
    if (!snippets) {
      try {
        const response = await fetch("snippets.json", { cache: "no-cache" });
        snippets = response.ok ? await response.json() : {};
      } catch {
        snippets = {};
      }
      render();
    }
  });

  return { setLanguage };
}

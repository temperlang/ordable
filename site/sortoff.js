// @ts-check

// The hero's before and after, and the sort-off: one list sorted three
// ways, side by side, with natural keys for a chosen row.

import { Order, compareNatural, naturalKey, sortNatural, sortNaturalByKey } from "ordable";

/** Case-sensitive natural order, for the switch. */
const caseSensitiveOrder = Order.new({ caseSensitive: true });

/**
 * A sample list, in a deliberately jumbled input order.
 * @typedef {{ name: string, items: string[], note?: string, keys?: [string, string] }} Sample
 *
 * `keys` is the pair the natural keys panel starts on: neighbors that show
 * the list's point in their keys, used when they're neighbors in Ordable's
 * order.
 */

/** @type {Sample[]} */
const SAMPLES = [
  // Mixed case, as from a camera and a download folder, so the
  // Case-sensitive switch visibly changes the first list.
  { name: "Photos", items: ["IMG_10.jpg", "IMG_9.jpg", "img_100.jpg", "img_1.jpg", "IMG_20.jpg", "img_2.jpg", "IMG_11.jpg"],
    keys: ["IMG_9.jpg", "IMG_10.jpg"] },
  {
    name: "Chapters",
    items: ["Chapter 10: Storm", "Chapter 2: Harbor", "Chapter 1: Letters", "Chapter 12: Home", "Chapter 3: Fog", "Chapter 11: Lighthouse"],
    keys: ["Chapter 3: Fog", "Chapter 10: Storm"],
  },
  { name: "Versions", items: ["v1.10.0", "v1.9.3", "v10.1.0", "v1.2.12", "v2.0.0", "v1.10.2", "v1.2.9"], keys: ["v1.2.9", "v1.2.12"] },
  {
    name: "Music tracks",
    items: ["10 Outro.flac", "1 Intro.flac", "9 Night Drive.flac", "2 Rise.flac", "11 Bonus.flac", "3 Echoes.flac"],
    keys: ["9 Night Drive.flac", "10 Outro.flac"],
  },
  // Zoe and Zoë differ only in the accents level.
  { name: "Accents", items: ["Zoë", "Émile", "Eve", "Zoe", "Ada", "Éva", "Zach", "Eduardo"], keys: ["Zoe", "Zoë"] },
  {
    name: "Arabic-Indic digits",
    items: ["file١٠", "file٢", "file10", "file2", "file١", "file3"],
    note: "١٠ is 10 and ٢ is 2, in Arabic-Indic digits.",
    // The same value in two scripts, which only the scripts level tells apart.
    keys: ["file2", "file٢"],
  },
  {
    name: "Straße / Strasse",
    items: ["Straße", "Strassen", "STRASSE", "Strase", "Strasse", "Straßen"],
    note: "ß matches ss, as Unicode's case folding says, unless case-sensitive.",
    keys: ["Strassen", "Straßen"],
  },
  { name: "Leading zeros", items: ["010", "2", "001", "1", "02", "10", "01", "3"], keys: ["1", "01"] },
];

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

/**
 * Text with each run of digits, in any script, in a <b>, so numbers stand out.
 *
 * @param {HTMLElement} el
 * @param {string} text
 */
function setDigits(el, text) {
  el.replaceChildren(
    ...text.split(/(\p{Nd}+)/u).map((part, i) => {
      if (i % 2 === 0) return part;
      const b = document.createElement("b");
      b.textContent = part;
      return b;
    }),
  );
}

/**
 * Puts `items` in `list` in their new order, gliding each one already
 * there from its old place (FLIP: first, last, invert, play), and fading
 * new ones in.
 *
 * @param {HTMLElement} list
 * @param {HTMLElement[]} items
 * @param {number} [duration]
 */
function flip(list, items, duration = 450) {
  const before = new Map([...list.children].map((el) => [el, el.getBoundingClientRect().top]));
  list.replaceChildren(...items);
  if (reducedMotion.matches) return;
  items.forEach((el, i) => {
    const old = before.get(el);
    if (old === undefined) {
      el.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], {
        duration: 300,
        delay: i * 30,
        easing: "ease-out",
        fill: "backwards",
      });
      return;
    }
    const dy = old - el.getBoundingClientRect().top;
    if (Math.abs(dy) > 0.5) {
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], {
        duration,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      });
    }
  });
}

// The hero: file names in plain order, gliding into natural order.

const HERO = ["file1.txt", "file10.txt", "file2.txt", "file3.txt"];

function initHero() {
  const list = $("hero-list");
  const label = $("hero-label");
  const rows = new Map(
    HERO.map((name) => {
      const li = document.createElement("li");
      setDigits(li, name);
      return [name, li];
    }),
  );
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const play = () => {
    clearTimeout(timer);
    // JavaScript's default sort compares UTF-16 code units, as most
    // languages' plain sorts compare code units or bytes.
    list.replaceChildren(...[...HERO].sort().map((name) => /** @type {HTMLElement} */ (rows.get(name))));
    label.textContent = "Plain sort";
    list.classList.remove("natural");
    timer = setTimeout(
      () => {
        flip(list, sortNatural(HERO).map((name) => /** @type {HTMLElement} */ (rows.get(name))), 900);
        label.textContent = "Ordable";
        list.classList.add("natural");
      },
      reducedMotion.matches ? 1600 : 1100,
    );
  };
  $("hero-replay").addEventListener("click", play);
  play();
}

// The sort-off.

/**
 * An input row: its text, and an id that stays with it through shuffles
 * and edits, so its element can glide to its new place.
 * @typedef {{ id: string, text: string }} Row
 */

/** @param {string[]} items @returns {Row[]} */
function toRows(items) {
  /** @type {Map<string, number>} */
  const seen = new Map();
  return items.map((text) => {
    const n = seen.get(text) ?? 0;
    seen.set(text, n + 1);
    return { id: `${text}\u0000${n}`, text };
  });
}

/** @param {Row[]} rows */
function shuffled(rows) {
  const out = [...rows];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The language's own sort, by code units, as `list.sort()` does.
 *
 * @param {Row[]} rows
 */
function plainSort(rows) {
  return [...rows].sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0));
}

// English, so everyone sees the same thing. Its default sensitivity,
// "variant", compares accents and then case only to break ties, as
// Ordable does by default; it has no setting that puts case first.
const intlCollator = new Intl.Collator("en", { numeric: true });

export function initSortOff() {
  initHero();

  let sample = SAMPLES[0];
  // Off at first: case only breaks ties, as most people want. Turning it on
  // shows what putting case first changes.
  let caseSensitive = false;
  /** @type {Row[]} */
  let input = toRows(sample.items);
  /** @type {string | null} The chosen row's id, for the keys panel. */
  let chosen = null;
  // Each column's rows, by id, kept across renders so they can glide.
  /** @type {Record<string, Map<string, HTMLElement>>} */
  const elements = { plain: new Map(), ordable: new Map(), intl: new Map() };
  /** @type {Row[]} */
  let ordableOrder = [];

  /**
   * The element for a row in a column, made on first use.
   *
   * @param {string} column
   * @param {Row} row
   */
  function rowElement(column, row) {
    let el = elements[column].get(row.id);
    if (!el) {
      el = document.createElement("li");
      if (column === "ordable") {
        const button = document.createElement("button");
        button.type = "button";
        button.addEventListener("click", () => choose(row.id));
        el.append(button);
        setDigits(button, row.text);
      } else {
        setDigits(el, row.text);
      }
      elements[column].set(row.id, el);
    }
    return el;
  }

  function render() {
    const plain = plainSort(input);
    const ordable = caseSensitive
      ? sortNaturalByKey(input, (row) => row.text, caseSensitiveOrder)
      : sortNaturalByKey(input, (row) => row.text);
    // A stable sort, so tied rows keep their input order.
    const intl = [...input].sort((a, b) => intlCollator.compare(a.text, b.text));
    ordableOrder = ordable;

    // Plain rows out of place: not where Ordable puts their text.
    let off = 0;
    const plainEls = plain.map((row, i) => {
      const el = rowElement("plain", row);
      const wrong = ordable[i].text !== row.text;
      el.classList.toggle("off", wrong);
      if (wrong) off++;
      return el;
    });
    flip($("rows-plain"), plainEls);
    $("plain-stat").textContent = off ? `${off} of ${plain.length} out of place` : "All in place";
    $("plain-stat").classList.toggle("bad", off > 0);

    flip($("rows-ordable"), ordable.map((row) => rowElement("ordable", row)));

    // Intl rows tied with a neighbor: different strings it calls equal.
    let ties = 0;
    const intlEls = intl.map((row, i) => {
      const el = rowElement("intl", row);
      const tied = [intl[i - 1], intl[i + 1]].some(
        (other) => other && other.text !== row.text && intlCollator.compare(other.text, row.text) === 0,
      );
      el.classList.toggle("tie", tied);
      if (tied) ties++;
      return el;
    });
    flip($("rows-intl"), intlEls);
    $("intl-stat").textContent = ties ? `${ties} rows in ties` : "No ties in this list";
    $("intl-stat").classList.toggle("warn", ties > 0);
    $("ordable-stat").textContent = "No ties, ever";

    // A break before the arguments, for narrow columns.
    $("ordable-sub").innerHTML = caseSensitive
      ? "Order.new({ caseSensitive: true })<wbr>.sort(list)"
      : "sortNatural<wbr>(list)";
    $("intl-sub").textContent = caseSensitive ? "numeric: true (can't put case first)" : "numeric: true";
    $("input-order").textContent = input.map((row) => row.text).join(" · ");
    showKeys();
  }

  // Sample chips.
  const chips = $("samples");
  for (const s of SAMPLES) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = s.name;
    chip.setAttribute("aria-pressed", String(s === sample));
    if (s.note) chip.title = s.note;
    chip.addEventListener("click", () => {
      sample = s;
      for (const c of chips.children) c.setAttribute("aria-pressed", String(c === chip));
      setInput(s.items);
      $("shuffle-note").textContent = s.note ?? "";
    });
    chips.append(chip);
  }

  /** @param {string[]} items */
  function setInput(items) {
    input = toRows(items);
    chosen = null;
    editText.value = items.join("\n");
    render();
  }

  // Case-sensitive.
  const caseSwitch = $("case-sensitive");
  caseSwitch.addEventListener("click", () => {
    caseSensitive = !caseSensitive;
    caseSwitch.setAttribute("aria-checked", String(caseSensitive));
    render();
  });

  // Edit list: a textarea for people who want to type their own.
  const editBox = $("edit-box");
  const editText = /** @type {HTMLTextAreaElement} */ ($("edit-text"));
  const editButton = $("edit-list");
  editButton.addEventListener("click", () => {
    const open = editBox.hidden;
    editBox.hidden = !open;
    editButton.setAttribute("aria-expanded", String(open));
    if (open) editText.focus();
  });
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let editTimer;
  editText.addEventListener("input", () => {
    clearTimeout(editTimer);
    editTimer = setTimeout(() => {
      const items = editText.value.split("\n").map((line) => line.trim()).filter((line) => line);
      // Keep ids for lines that stay, so their rows glide.
      input = toRows(items);
      for (const c of chips.children) c.setAttribute("aria-pressed", "false");
      render();
    }, 200);
  });

  // Phones show Ordable beside one other column, chosen here.
  const compareButtons = [...document.querySelectorAll(".compare-with button")];
  /** @param {string} which */
  const compareWith = (which) => {
    $("columns").dataset.compare = which;
    for (const button of compareButtons) {
      button.setAttribute("aria-pressed", String(/** @type {HTMLElement} */ (button).dataset.compare === which));
    }
  };
  for (const button of compareButtons) {
    button.addEventListener("click", () => compareWith(/** @type {HTMLElement} */ (button).dataset.compare ?? "plain"));
  }

  // Shuffle: reorders the input several times, counting the different
  // orders each column gives. Ordable's and plain sorting's never change.
  const shuffleButton = /** @type {HTMLButtonElement} */ ($("shuffle"));
  shuffleButton.addEventListener("click", async () => {
    shuffleButton.disabled = true;
    // The shuffle is about Intl.Collator's ties, so phones show its column.
    compareWith("intl");
    const columns = ["rows-plain", "rows-ordable", "rows-intl"];
    /** @type {Set<string>[]} */
    const seen = columns.map(() => new Set());
    const record = () =>
      columns.forEach((id, i) => seen[i].add([...$(id).children].map((li) => li.textContent).join("\n")));
    const times = 6;
    for (let n = 0; n < times; n++) {
      await new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? 250 : 550));
      input = shuffled(input);
      render();
      record();
      $("shuffle-note").textContent = `Shuffle ${n + 1} of ${times}…`;
    }
    const [plainOrders, ordableOrders, intlOrders] = seen.map((s) => s.size);
    const orders = (/** @type {number} */ n) => (n === 1 ? "1 order" : `${n} different orders`);
    $("shuffle-note").textContent =
      `${times} shuffles: Ordable gave ${orders(ordableOrders)}, Intl.Collator ${orders(intlOrders)}` +
      (plainOrders > 1 ? `, plain sort ${orders(plainOrders)}. ` : ". ") +
      (intlOrders > 1
        ? "Intl.Collator calls some different strings equal, so they stay in whatever order they came in. " +
          "Ordable never does, so the same list always sorts the same way, on every machine and in every language."
        : "This list has no ties for Intl.Collator. Try Leading zeros or Arabic-Indic digits, or Accents ignoring case.");
    shuffleButton.disabled = false;
  });

  // Natural keys for the chosen row and the row after it.

  /** @param {string | null} id */
  function choose(id) {
    chosen = id;
    showKeys();
  }

  /**
   * A key's code points in hex, with separators (U+0001) set apart.
   *
   * @param {HTMLElement} el
   * @param {string} key
   * @param {number} differAt The code point where this key first differs from the other, marked, or -1.
   */
  function showKey(el, key, differAt = -1) {
    el.replaceChildren(
      ...[...key].flatMap((c, i) => {
        const code = /** @type {number} */ (c.codePointAt(0));
        const span = document.createElement("span");
        span.textContent = code.toString(16).toUpperCase();
        span.className = [code === 1 ? "sep" : "", i === differAt ? "differ" : ""].join(" ").trim();
        return i ? [" ", span] : [span];
      }),
    );
  }

  /** Where two keys first differ, counting code points, or -1 if one starts the other. */
  function firstDifference(/** @type {string} */ x, /** @type {string} */ y) {
    const xs = [...x];
    const ys = [...y];
    for (let k = 0; k < Math.min(xs.length, ys.length); k++) {
      if (xs[k] !== ys[k]) return k;
    }
    return -1;
  }

  function showKeys() {
    const rows = ordableOrder;
    const keyOf = caseSensitive ? (/** @type {string} */ s) => caseSensitiveOrder.key(s) : naturalKey;
    const compare = caseSensitive
      ? (/** @type {string} */ a, /** @type {string} */ b) => caseSensitiveOrder.compare(a, b)
      : compareNatural;
    // By default, the first neighbors that plain sorting would swap, as 9
    // and 10 are, so the keys show how numbers are written: best when
    // they differ only in their digits. Else the second row, so there's a
    // row after it.
    let i = rows.findIndex((row) => row.id === chosen);
    if (i < 0 && sample.keys) {
      // The list's own pair, if they're neighbors.
      const [x, y] = sample.keys;
      i = rows.findIndex((row, k) => k + 1 < rows.length && new Set([row.text, rows[k + 1].text]).size === 2 &&
        [row.text, rows[k + 1].text].every((t) => t === x || t === y));
    }
    if (i < 0) {
      const plainText = (/** @type {Row} */ row) => row.text;
      const swapped = (/** @type {number} */ k) => k + 1 < rows.length && plainText(rows[k]) > plainText(rows[k + 1]);
      const letters = (/** @type {Row} */ row) => row.text.replace(/\p{Nd}/gu, "");
      i = rows.findIndex((row, k) => swapped(k) && letters(row) === letters(rows[k + 1]));
      if (i < 0) i = rows.findIndex((_, k) => swapped(k));
    }
    if (i < 0) i = Math.min(1, rows.length - 1);
    for (const [id, el] of elements.ordable) el.classList.toggle("chosen", rows[i]?.id === id);
    const keysPanel = $("keys");
    keysPanel.hidden = rows.length === 0;
    if (!rows.length) return;
    const a = rows[i];
    const b = rows[i + 1] ?? rows[i - 1];
    const keyA = keyOf(a.text);
    const keyB = b ? keyOf(b.text) : "";
    const differAt = b ? firstDifference(keyA, keyB) : -1;
    $("key-a-name").textContent = a.text;
    showKey($("key-a"), keyA, differAt);
    $("key-b-name").textContent = b ? b.text : "";
    showKey($("key-b"), keyB, differAt);
    $("key-b").parentElement.hidden = $("key-b-name").hidden = !b;
    if (b) {
      const [first, second] = rows.indexOf(b) > i ? [a, b] : [b, a];
      const plain = keyOf(first.text) <= keyOf(second.text);
      const natural = compare(first.text, second.text) <= 0;
      $("key-check").textContent =
        `${plain ? "✓" : "✗"} key(${first.text}) ${plain ? "<" : ">"} key(${second.text}) by plain comparison, ` +
        `just as ${caseSensitive ? "the case-sensitive order" : "compareNatural"} puts ${first.text} ` +
        `${natural ? "first" : "second"}${differAt >= 0 ? ", deciding at the highlighted code points" : ""}.`;
    } else {
      $("key-check").textContent = "";
    }
    // Every key, sorted with plain comparison, gives Ordable's order.
    const byKey = [...rows].map((row) => ({ row, key: keyOf(row.text) })).sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
    const same = byKey.every(({ row }, k) => row.text === rows[k].text);
    $("key-all").textContent = same
      ? `✓ All ${rows.length} keys, sorted plainly, give Ordable's order.`
      : "✗ The keys sort differently from Ordable's order.";
  }

  setInput(sample.items);
}

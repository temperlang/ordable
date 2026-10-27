# Natural Order

People expect `file2` before `file10`, but comparing code points puts
`file10` first, since `1` comes before `2`. Natural order fixes that by
comparing each run of decimal digits as a number, and everything else by
code point. Digits in any script count, such as Arabic-Indic `٢` or
fullwidth `２`.

This isn't what Java and Kotlin call natural order (`naturalOrder()`),
which for strings is the plain code-unit order this replaces.

## Comparing

Each returns a negative number if `a` comes first, positive if `b` does, and
0 only if the strings are equal. That makes the order total, so sorting
gives the same result whatever order the input was in.

By default, as people expect: case only breaks ties, lowercase first, so
`a` and `A` come before `B`, in any script with case (`é` and `É`, `Σ` and
`σ`), and accents only break ties before that, so `é` sorts with `e`. See
[options](#options) for other orders.

    export let compareNatural(a: String, b: String): Int {
      natural.compare(a, b)
    }

## Sorting

A sorted copy, in natural order. Sorting is stable, though with a total
order that only matters for equal strings.

    export let sortNatural(strings: List<String>): List<String> {
      natural.sort(strings)
    }

A sorted copy of any items, in the natural order of a string from each,
such as files by name: `sortNaturalByKey(files) { file => file.name }`.
Each key is made once, not once per comparison, so `key` can do some work.
Items with the same key keep their order. An `order` with
[options](#options) changes the order.

    export let sortNaturalByKey<T>(items: List<T>, key: fn (T): String, order: Order = natural): List<T> {
      sortByKeys(items, items.map(key), order)
    }

Sorts positions by their keys, then picks the items in that order. Past
a few items, it first makes each key's [natural sort key](key.temper.md),
so each comparison is a plain string comparison instead of a natural
one.

    let sortByKeys<T>(items: List<T>, keys: List<String>, order: Order): List<T> {
      let positions = new ListBuilder<Int>();
      for (var i = 0; i < items.length; i += 1) {
        positions.add(i);
      }
      let sorted = if (items.length < sortKeysFrom) {
        positions.toList().sorted { a, b => compareWith(keys[a], keys[b], order) }
      } else {
        let naturalKeys: List<String> = keys.map { k => keyWith(k, order) };
        positions.toList().sorted { a, b => naturalKeys[a] <=> naturalKeys[b] }
      };
      sorted.map { i => items[i] }
    }

## Options

An `Order` is natural order with options, with `compare`, `sort`, and
`key` as methods, and `sortNaturalByKey` takes one too. (A generic
`sortByKey` method would fit here, but Temper's C++ backend can't yet
compile a generic method that calls a generic function, so it waits.) Every option has a default, so an object literal names only what
changes, such as `{ upperFirst: true }`.

- **`upperFirst`:** when strings differ only in case, uppercase comes
  first, `A` before `a`. By default lowercase does, as in most other
  sorts.
- **`caseSensitive`:** case counts as much as the letter, as in plain
  sorting, so every `B` comes before every `a`, and `ß` doesn't match
  `ss`. Then letters compare by code point, so `upperFirst` has no say.
- **`ignoreAccents`:** accents don't count, so `é` equals `e`, and `ß`
  equals `ss`. Leading zeros and digit scripts still count.
- **`ignoreCase`:** case doesn't count, so `A` equals `a`, and neither do
  odd forms, so `ς` equals `σ`, and the Kelvin sign equals `K`. Then
  `upperFirst` has no say, and nor does this when case-sensitive.

With either of the last two, different strings can compare equal, and
their keys are then the same, so a database can match them by key.
Sorting keeps equal strings in their input order.

The options, and the functions as methods:

    export class Order(
      public upperFirst: Boolean = false,
      public caseSensitive: Boolean = false,
      public ignoreAccents: Boolean = false,
      public ignoreCase: Boolean = false,
    ) {
      public compare(a: String, b: String): Int { compareWith(a, b, this) }

      public sort(strings: List<String>): List<String> {
        sortByKeys(strings, strings, this)
      }

      public key(s: String): String { keyWith(s, this) }
    }

The default order, behind the functions above.

    let natural: Order = new Order(false, false, false, false);

    let sortKeysFrom = 16;

## How It Works

Strings compare in levels, each one only deciding when all before it
tie:

1. **Letters and numbers.** Both strings are walked together, a
   character or a run of digits at a time. Accents don't count at this
   level, so `é` sorts with `e`, and letters fold fully, so `ß` matches
   `ss`, and `Σ` matches `σ` and `ς` (unless case-sensitive). Numbers
   compare by value without converting them, so any number of digits
   works without overflow: after skipping leading zeros, more digits
   means bigger, and equal lengths compare digit by digit. A run of
   digits is all from one script, so `1٢` is two numbers, and runs in
   different scripts compare by value, so `٢` comes before `10`. A digit
   against anything else sorts as its ASCII digit would.
2. **Leading zeros:** the first difference, fewer first, so `1` before
   `01`.
3. **Digit scripts:** the first difference, by code point, so `1` before
   `١`.
4. **Accents:** the first difference in the characters other than
   digits, case folded (unless case-sensitive), where one without an
   accent comes first, so `e` before `é`, and `ss` before `ß`.
5. **Case:** the first character that's not folded in one string but is
   in the other, lowercase first (or uppercase, with `upperFirst`), so
   `e` before `E`.
6. **Code points:** the first difference in odd forms of letters, such
   as the Kelvin sign `K`, which folds and has case like `K` but comes
   after it. Only 30 characters are odd forms.

Case-sensitive, letters aren't folded, so the first and fourth levels
decide everything, and the last two never come up.

Two strings tie at every level only if they're the same, which keeps the
order total ([order properties](properties.temper.md)). `ignoreAccents`
skips the accents level, and `ignoreCase` the last two.

Accents come from Unicode's canonical decompositions, and case folding
is Unicode's ([unicode](unicode.temper.md)).

    let compareWith(a: String, b: String, order: Order): Int {
      let fold = !order.caseSensitive;
      var i = String.begin;
      var j = String.begin;
      // Where the rest of a full folding (ß's second s) is in `fullFolds`, or -1.
      var restA = -1;
      var restB = -1;
      var zeros = 0;
      var scripts = 0;
      while ((restA >= 0 || a.hasIndex(i)) && (restB >= 0 || b.hasIndex(j))) {
        if (restA < 0 && restB < 0) {
          let zeroA = digitZero(a[i]);
          let zeroB = digitZero(b[j]);
          if (zeroA >= 0 && zeroB >= 0) {
            var zerosA = 0;
            while (a.hasIndex(i) && a[i] == zeroA) {
              zerosA += 1;
              i = a.next(i);
            }
            var zerosB = 0;
            while (b.hasIndex(j) && b[j] == zeroB) {
              zerosB += 1;
              j = b.next(j);
            }
            let lengthA = a.countBetween(i, digitsEnd(a, i, zeroA));
            let lengthB = b.countBetween(j, digitsEnd(b, j, zeroB));
            if (lengthA != lengthB) {
              return sign(lengthA - lengthB);
            }
            while (a.hasIndex(i) && isDigitOf(a[i], zeroA)) {
              let diff = (a[i] - zeroA) - (b[j] - zeroB);
              if (diff != 0) {
                return sign(diff);
              }
              i = a.next(i);
              j = b.next(j);
            }
            if (zeros == 0) {
              zeros = zerosA - zerosB;
            }
            if (scripts == 0) {
              scripts = zeroA - zeroB;
            }
            continue;
          }
        }
        var unitA = 0;
        if (restA >= 0) {
          unitA = fullFolds[restA];
          restA = nextRest(restA);
        } else {
          let c = a[i];
          i = a.next(i);
          unitA = firstUnit(c, fold);
          restA = foldRest(c, fold);
        }
        var unitB = 0;
        if (restB >= 0) {
          unitB = fullFolds[restB];
          restB = nextRest(restB);
        } else {
          let c = b[j];
          j = b.next(j);
          unitB = firstUnit(c, fold);
          restB = foldRest(c, fold);
        }
        if (unitA != unitB) {
          return sign(unitA - unitB);
        }
      }
      if (restA >= 0 || a.hasIndex(i)) {
        1
      } else if (restB >= 0 || b.hasIndex(j)) {
        -1
      } else if (zeros != 0) {
        sign(zeros)
      } else if (scripts != 0) {
        sign(scripts)
      } else {
        compareMarks(a, b, order)
      }
    }

The first level's unit for `c`: a digit as its ASCII digit, and anything
else as its base letter, folded fully when `fold`. ASCII needs no
tables. A full folding can give more than one unit, as `s s` for `ß`:
this is the first, and `foldRest` says where the rest are. (Plain
variables, not an object per string, keep this fast in every language.)

    let firstUnit(c: Int, fold: Boolean): Int {
      if (c < 0x80) {
        return if (fold) { foldCase(c) } else { c };
      }
      let zero = digitZero(c);
      if (zero >= 0) {
        return char'0' + (c - zero);
      }
      let base = baseLetter(c);
      if (!fold) {
        return base;
      }
      if (base >= 0x80) {
        let entry = findEntry(fullFolds, 4, base);
        if (entry >= 0) {
          return fullFolds[entry + 1];
        }
      }
      foldCase(base)
    }

Where the rest of `c`'s full folding is in `fullFolds`, or -1 if there's
none; then `nextRest` steps through it.

    let foldRest(c: Int, fold: Boolean): Int {
      if (!fold || c < 0x80) {
        return -1;
      }
      let base = baseLetter(c);
      if (base < 0x80) {
        return -1;
      }
      let entry = findEntry(fullFolds, 4, base);
      if (entry >= 0 && fullFolds[entry + 2] != 0) { entry + 2 } else { -1 }
    }

    let nextRest(at: Int): Int {
      if (((at + 1) % 4 orelse panic()) != 0 && fullFolds[at + 1] != 0) { at + 1 } else { -1 }
    }

The last levels, from accents on, over the characters other than
digits: the first difference in accents decides, else the first in
case, else the first in code points. Each level is a weight per
character, where 0 is the usual case (no accent, the case that comes
first, an ordinary letter), and a string that runs out reads as 0s, so
only what's unusual counts and keys can leave trailing 0s out
([keys](key.temper.md)).

    let compareMarks(a: String, b: String, order: Order): Int {
      let marks = !order.ignoreAccents;
      let fold = !order.caseSensitive && !order.ignoreCase;
      if (!marks && !fold) {
        return 0;
      }
      var i = skipDigits(a, String.begin);
      var j = skipDigits(b, String.begin);
      var cases = 0;
      var codes = 0;
      while (a.hasIndex(i) || b.hasIndex(j)) {
        var x = -1;
        if (a.hasIndex(i)) {
          x = a[i];
          i = skipDigits(a, a.next(i));
        }
        var y = -1;
        if (b.hasIndex(j)) {
          y = b[j];
          j = skipDigits(b, b.next(j));
        }
        if (marks) {
          let diff = markWeight(x, !order.caseSensitive) - markWeight(y, !order.caseSensitive);
          if (diff != 0) {
            return sign(diff);
          }
        }
        if (fold && cases == 0) {
          cases = caseWeight(x, order) - caseWeight(y, order);
        }
        if (fold && codes == 0) {
          codes = codeWeight(x) - codeWeight(y);
        }
      }
      if (cases != 0) { sign(cases) } else { sign(codes) }
    }

The accents weight of `c`, or of none (-1): 0 if it has no accent (its
case folding, unless case-sensitive, is its first-level unit, all of
it), else that folding, so `e` comes before `é`, and `ss` before `ß`.

    let markWeight(c: Int, fold: Boolean): Int {
      if (c < 0x80) {
        return 0;
      }
      let mark = if (fold) { foldCase(c) } else { c };
      plainOr(mark, firstUnit(c, fold), foldRest(c, fold))
    }

    let plainOr(mark: Int, unit: Int, rest: Int): Int {
      if (mark == unit && rest < 0) { 0 } else { mark }
    }

The case weight of `c`, or of none (-1), 0 or 1, the case that comes
first being 0: lowercase (a character its own folding) by default, else
uppercase.

    let caseWeight(c: Int, order: Order): Int {
      if (c < 0) {
        return 0;
      }
      let lower = foldCase(c) == c;
      if (lower == order.upperFirst) { 1 } else { 0 }
    }

The code point weight of `c`, or of none (-1): 0 for most, but an [odd
case](unicode.temper.md#odd-cases) like the Kelvin sign is itself, so
it comes after `K`.

    let codeWeight(c: Int): Int {
      if (isOddCase(c)) { c } else { 0 }
    }

    let skipDigits(s: String, start: StringIndex): StringIndex {
      var i = start;
      while (s.hasIndex(i) && digitZero(s[i]) >= 0) {
        i = s.next(i);
      }
      i
    }

    let digitsEnd(s: String, start: StringIndex, zero: Int): StringIndex {
      var i = start;
      while (s.hasIndex(i) && isDigitOf(s[i], zero)) {
        i = s.next(i);
      }
      i
    }

    let sign(x: Int): Int {
      if (x < 0) { -1 } else if (x > 0) { 1 } else { 0 }
    }

## Tests

    let assertBefore(test: Test, a: String, b: String): Void {
      assert(compareNatural(a, b) < 0) { "${a} not before ${b}" }
      assert(compareNatural(b, a) > 0) { "${b} not after ${a}" }
    }

    let assertBeforeIn(test: Test, order: Order, a: String, b: String): Void {
      assert(order.compare(a, b) < 0) { "${a} not before ${b}" }
      assert(order.compare(b, a) > 0) { "${b} not after ${a}" }
    }

    let sensitiveOrder: Order = { caseSensitive: true };
    let upperOrder: Order = { upperFirst: true };
    let accentlessOrder: Order = { ignoreAccents: true };
    let caselessOrder: Order = { ignoreCase: true };
    let baseOrder: Order = { ignoreAccents: true, ignoreCase: true };

    test("numbers compare by value") { test =>
      assertBefore(test, "file2", "file10");
      assertBefore(test, "x9", "x10");
      assertBefore(test, "x10", "x100");
      assertBefore(test, "1.9", "1.10");
      assertBefore(test, "a2b3", "a2b10");
      assertBefore(test, "a2", "a2b");
      assertBefore(test, "", "0");
    }

    test("long numbers don't overflow") { test =>
      assertBefore(test, "99999999999999999999", "123456789012345678901234567890");
      assertBefore(test, "v123456789012345678901234567890", "v123456789012345678901234567891");
    }

    test("leading zeros only break ties") { test =>
      assertBefore(test, "1", "01");
      assertBefore(test, "01", "001");
      assertBefore(test, "001", "2");
      assertBefore(test, "a1b02", "a01b2");
      assertBefore(test, "0", "00");
    }

    test("digits against other characters compare by code point") { test =>
      assertBefore(test, " ", "0");
      assertBefore(test, "9", "a");
      assertBefore(test, "a1", "aa");
    }

    test("case only breaks ties, lowercase first") { test =>
      assertBefore(test, "a", "B");
      assertBefore(test, "a", "A");
      assertBefore(test, "A", "b");
      assertBefore(test, "File2", "file10");
      assert(compareNatural("Ab", "Ab") == 0);
    }

    test("no accent before any accent") { test =>
      assertBefore(test, "e", "\u{E9}"); // é
      assertBefore(test, "\u{3B1}", "\u{3AC}"); // α before ά, though ά's code point is lower
      assertBefore(test, "ss", "\u{DF}"); // ß
      assertBefore(test, "e\u{E9}", "\u{E9}e"); // the first difference decides
    }

    test("odd forms last") { test =>
      assertBefore(test, "K", "\u{212A}"); // Kelvin sign
      assertBefore(test, "\u{39C}", "\u{B5}"); // Μ before µ, though µ's code point is lower
      assertBefore(test, "\u{3A3}", "\u{3C2}"); // Σ before ς
    }

    test("uppercase first") { test =>
      assertBeforeIn(test, upperOrder, "A", "a");
      assertBeforeIn(test, upperOrder, "a", "B");
      assertBeforeIn(test, upperOrder, "File2", "file10");
    }

    test("case-sensitive") { test =>
      // Case counts as much as the letter, by code point: B before a.
      assertBeforeIn(test, sensitiveOrder, "B", "a");
      assertBeforeIn(test, sensitiveOrder, "IMG10", "img2");
      assertBeforeIn(test, sensitiveOrder, "img2", "img10");
      // ß is its own letter, after z.
      assertBeforeIn(test, sensitiveOrder, "Straz", "Straße");
    }

    test("case beyond ASCII") { test =>
      // É matches é; Σ, σ, and ς match; Ж matches ж.
      assertBefore(test, "\u{C9}cole2", "\u{E9}cole10");
      assertBefore(test, "\u{C9}", "z");
      assertBefore(test, "\u{3A3}2", "\u{3C3}10");
      assertBefore(test, "\u{3C2}1", "\u{3A3}2");
      assertBefore(test, "\u{416}a", "\u{436}b");
      // Same apart from case: lowercase first.
      assertBefore(test, "\u{3C3}", "\u{3A3}");
    }

    test("digits in other scripts against other characters") { test =>
      // As their ASCII digits would: before letters, after spaces.
      assertBefore(test, "\u{662}", "z");
      assertBefore(test, " ", "\u{662}");
      assertBefore(test, "\u{FF12}", "a");
    }

    test("digits in other scripts") { test =>
      // Arabic-Indic ٢ and ١٠, Devanagari ९, fullwidth ２.
      assertBefore(test, "file\u{662}", "file\u{661}\u{660}");
      assertBefore(test, "file\u{662}", "file10");
      assertBefore(test, "file2", "file\u{661}\u{660}");
      assertBefore(test, "x\u{96F}", "x10");
      assertBefore(test, "\u{FF12}", "\u{FF11}\u{FF10}");
      // Leading zeros in their own script.
      assertBefore(test, "\u{661}", "\u{660}\u{661}");
      // One run per script: 1 then ٢, against 12.
      assertBefore(test, "1\u{662}", "12");
      // Same value: the script breaks the tie, after leading zeros.
      assertBefore(test, "1", "\u{661}");
      assertBefore(test, "\u{661}", "01");
      assertBefore(test, "a\u{661}b", "a1c");
    }

    test("equal only when the same") { test =>
      assert(compareNatural("", "") == 0);
      assert(compareNatural("a10b", "a10b") == 0);
      assert(compareNatural("é2", "é10") < 0);
      // The Kelvin sign folds to k and is uppercase, as K is, so only the
      // code point tells them apart.
      assertBefore(test, "K", "\u{212A}");
    }

    test("accents") { test =>
      // Accents only break ties, so é sorts with e, and ǖ with u.
      assertBefore(test, "é", "f");
      assertBefore(test, "école2", "ecole10");
      assertBefore(test, "u", "\u{1D6}");
      assertBefore(test, "\u{1D6}", "v");
      // Accents count before case: e, E, é, É, as Intl.Collator does.
      assertBefore(test, "e", "E");
      assertBefore(test, "E", "\u{E9}");
      assertBefore(test, "\u{E9}", "\u{C9}");
      assertBefore(test, "\u{C9}", "f");
      // With uppercase first: E, e, É, é.
      assertBeforeIn(test, upperOrder, "E", "e");
      assertBeforeIn(test, upperOrder, "e", "\u{C9}");
      assertBeforeIn(test, upperOrder, "\u{C9}", "\u{E9}");
    }

    test("full case folding") { test =>
      // ß matches ss, then sorts after it; ﬁ matches fi.
      assertBefore(test, "Strase", "Strasse");
      assertBefore(test, "Strasse", "STRASSE");
      assertBefore(test, "STRASSE", "Straße");
      assertBefore(test, "Straße", "Strassen");
      assertBefore(test, "\u{FB01}le2", "file10");
    }

    test("sorting") { test =>
      let names = ["img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png"];
      let sorted = sortNatural(names);
      assert(sorted.join(" ") { s => s } == "img1.png img2.png IMG2.png img10.png img12.png");
      let sensitive = sensitiveOrder.sort(names);
      assert(sensitive.join(" ") { s => s } == "IMG2.png img1.png img2.png img10.png img12.png");
    }

    test("ignoring accents") { test =>
      assert(accentlessOrder.compare("\u{E9}cole", "ecole") == 0);
      assert(accentlessOrder.compare("Stra\u{DF}e", "Strasse") == 0);
      // Case still counts, and so do leading zeros and digit scripts.
      assertBeforeIn(test, accentlessOrder, "\u{E9}", "E");
      assertBeforeIn(test, accentlessOrder, "x1", "x01");
      assertBeforeIn(test, accentlessOrder, "x1", "x\u{661}");
      assertBeforeIn(test, accentlessOrder, "\u{E9}2", "e10");
    }

    test("ignoring case") { test =>
      assert(caselessOrder.compare("File2", "file2") == 0);
      assert(caselessOrder.compare("\u{3C2}", "\u{3A3}") == 0); // ς and Σ
      assert(caselessOrder.compare("\u{212A}", "k") == 0); // the Kelvin sign
      assertBeforeIn(test, caselessOrder, "E", "\u{E9}");
      assertBeforeIn(test, caselessOrder, "file2", "FILE10");
      // No say when case-sensitive.
      let both: Order = { caseSensitive: true, ignoreCase: true };
      assertBeforeIn(test, both, "B", "a");
    }

    test("ignoring both") { test =>
      assert(baseOrder.compare("\u{C9}T\u{C9}", "ete") == 0);
      assertBeforeIn(test, baseOrder, "ete", "\u{E9}t\u{E9}2");
      // Equal strings keep their input order when sorting.
      let sorted = baseOrder.sort(["b", "\u{E9}", "E", "a", "e"]);
      assert(sorted.join(" ") { s => s } == "a b \u{E9} E e");
    }

    class Track(public title: String, public seconds: Int) {}

    test("sorting by key") {
      let tracks = [
        new Track("Track 10: Outro", 95),
        new Track("track 2: Rise", 184),
        new Track("Track 1: Intro", 61),
        new Track("Track 2: Rise again", 30),
      ];
      var calls = 0;
      let titles = sortNaturalByKey(tracks) { track =>
        calls += 1;
        track.title
      };
      assert(calls == 4);
      assert(titles.join(", ") { t => t.title } == "Track 1: Intro, track 2: Rise, Track 2: Rise again, Track 10: Outro");
      let sensitive = sortNaturalByKey(tracks, fn (track: Track): String { track.title }, sensitiveOrder);
      assert(sensitive.join(", ") { t => t.title } == "Track 1: Intro, Track 2: Rise again, Track 10: Outro, track 2: Rise");
    }

Equal keys keep their order.

    test("sorting by key is stable") {
      let tracks = [new Track("b", 1), new Track("a", 2), new Track("b", 3), new Track("a", 4)];
      let sorted = sortNaturalByKey(tracks) { track => track.title };
      assert(sorted.join(" ") { t => t.seconds.toString() } == "2 4 1 3");
    }

# Natural Order

People expect `file2` before `file10`, but comparing code points puts
`file10` first, since `1` comes before `2`. Natural order fixes that by
comparing each run of decimal digits as a number, and everything else by
code point. Digits in any script count, such as Arabic-Indic `٢` or
fullwidth `２`.

## Comparing

Each returns a negative number if `a` comes first, positive if `b` does, and
0 only if the strings are equal. That makes the order total, so sorting
gives the same result whatever order the input was in.

Code points compare as they are, so `B` comes before `a`.

    export let compareNatural(a: String, b: String): Int {
      compareWith(a, b, false)
    }

The same, but ignoring case, so `a` comes before `B`, in any script with
case: `é` and `É`, `Σ` and `σ`. Strings that differ only in case still
don't tie: uppercase comes first, as in `A` before `a`.

    export let compareNaturalIgnoringCase(a: String, b: String): Int {
      compareWith(a, b, true)
    }

## Sorting

A sorted copy, in natural order. Sorting is stable, though with a total
order that only matters for equal strings.

    export let sortNatural(strings: List<String>): List<String> {
      sortByKeys(strings, strings, false)
    }

    export let sortNaturalIgnoringCase(strings: List<String>): List<String> {
      sortByKeys(strings, strings, true)
    }

A sorted copy of any items, in the natural order of a string from each,
such as files by name: `sortNaturalByKey(files) { file => file.name }`.
Each key is made once, not once per comparison, so `key` can do some work.
Items with the same key keep their order.

    export let sortNaturalByKey<T>(items: List<T>, key: fn (T): String): List<T> {
      sortByKeys(items, items.map(key), false)
    }

    export let sortNaturalByKeyIgnoringCase<T>(items: List<T>, key: fn (T): String): List<T> {
      sortByKeys(items, items.map(key), true)
    }

Sorts positions by their keys, then picks the items in that order. Past
a few items, it first makes each key's [natural sort key](key.temper.md),
so each comparison is a plain string comparison instead of a natural
one.

    let sortByKeys<T>(items: List<T>, keys: List<String>, ignoreCase: Boolean): List<T> {
      let positions = new ListBuilder<Int>();
      for (var i = 0; i < items.length; i += 1) {
        positions.add(i);
      }
      let sorted = if (items.length < sortKeysFrom) {
        positions.toList().sorted { a, b => compareWith(keys[a], keys[b], ignoreCase) }
      } else {
        let natural: List<String> = keys.map { k => keyWith(k, ignoreCase) };
        positions.toList().sorted { a, b => natural[a] <=> natural[b] }
      };
      sorted.map { i => items[i] }
    }

    let sortKeysFrom = 16;

## How It Works

Both strings are walked together, a code point or a run of digits at a
time. Numbers compare by value without converting them, so any number of
digits works without overflow: after skipping leading zeros, more digits
means bigger, and equal lengths compare digit by digit.

A run of digits is all from one script, so `1٢` is two numbers. Runs in
different scripts compare by value, so `٢` comes before `10`.

Things that don't change the main order are kept as tiebreaks, used only
if everything else is equal, in this order: the first difference in
leading zeros (fewer first, so `1` before `01`), then in the digits'
script (by code point, so `1` before `١`), and, when ignoring case, then
in case. That keeps the order total.

Ignoring case uses Unicode's simple case folding
([unicode](unicode.temper.md)), one code point to one, so `ß` doesn't
match `ss`.

    let compareWith(a: String, b: String, ignoreCase: Boolean): Int {
      var i = String.begin;
      var j = String.begin;
      var zeros = 0;
      var scripts = 0;
      var cases = 0;
      while (a.hasIndex(i) && b.hasIndex(j)) {
        let x = a[i];
        let y = b[j];
        let zeroA = digitZero(x);
        let zeroB = digitZero(y);
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
          let endA = digitsEnd(a, i, zeroA);
          let endB = digitsEnd(b, j, zeroB);
          let lengthA = a.countBetween(i, endA);
          let lengthB = b.countBetween(j, endB);
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
        } else {
          let diff = sortKey(x, zeroA, ignoreCase) - sortKey(y, zeroB, ignoreCase);
          if (diff != 0) {
            return sign(diff);
          }
          if (cases == 0) {
            cases = x - y;
          }
          i = a.next(i);
          j = b.next(j);
        }
      }
      if (a.hasIndex(i)) {
        1
      } else if (b.hasIndex(j)) {
        -1
      } else if (zeros != 0) {
        sign(zeros)
      } else if (scripts != 0) {
        sign(scripts)
      } else {
        sign(cases)
      }
    }

A digit against anything else sorts as its ASCII digit would, whatever
its script, so `٢` comes before `z` just as `2` does. Comparing by its
own code point instead would break transitivity: `٢` before `10` (by
value) and `10` before `z`, yet `٢` after `z`.

    let sortKey(c: Int, zero: Int, ignoreCase: Boolean): Int {
      if (zero >= 0) {
        char'0' + (c - zero)
      } else if (ignoreCase) {
        foldCase(c)
      } else {
        c
      }
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

    let assertBeforeIgnoringCase(test: Test, a: String, b: String): Void {
      assert(compareNaturalIgnoringCase(a, b) < 0) { "${a} not before ${b}" }
      assert(compareNaturalIgnoringCase(b, a) > 0) { "${b} not after ${a}" }
    }

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

    test("case") { test =>
      assertBefore(test, "B", "a");
      assertBeforeIgnoringCase(test, "a", "B");
      assertBeforeIgnoringCase(test, "A", "a");
      assertBeforeIgnoringCase(test, "File2", "file10");
      assert(compareNaturalIgnoringCase("Ab", "Ab") == 0);
    }

    test("case beyond ASCII") { test =>
      // É matches é, though both still come after z (accents aren't
      // folded); Σ, σ and ς match; Ж matches ж.
      assertBefore(test, "z", "\u{C9}");
      assertBeforeIgnoringCase(test, "\u{C9}cole2", "\u{E9}cole10");
      assertBeforeIgnoringCase(test, "z", "\u{C9}");
      assertBeforeIgnoringCase(test, "\u{3A3}2", "\u{3C3}10");
      assertBeforeIgnoringCase(test, "\u{3C2}1", "\u{3A3}2");
      assertBeforeIgnoringCase(test, "\u{416}a", "\u{436}b");
      // Same apart from case: the code point breaks the tie, so uppercase first.
      assertBeforeIgnoringCase(test, "\u{3A3}", "\u{3C3}");
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
      assertBefore(test, "z", "é");
    }

    test("sorting") { test =>
      let names = ["img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png"];
      let sorted = sortNatural(names);
      assert(sorted.join(" ") { s => s } == "IMG2.png img1.png img2.png img10.png img12.png");
      let ignoring = sortNaturalIgnoringCase(names);
      assert(ignoring.join(" ") { s => s } == "img1.png IMG2.png img2.png img10.png img12.png");
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
      assert(titles.join(", ") { t => t.title } == "Track 1: Intro, Track 2: Rise again, Track 10: Outro, track 2: Rise");
      let ignoring = sortNaturalByKeyIgnoringCase(tracks) { track => track.title };
      assert(ignoring.join(", ") { t => t.title } == "Track 1: Intro, track 2: Rise, Track 2: Rise again, Track 10: Outro");
    }

Equal keys keep their order.

    test("sorting by key is stable") {
      let tracks = [new Track("b", 1), new Track("a", 2), new Track("b", 3), new Track("a", 4)];
      let sorted = sortNaturalByKey(tracks) { track => track.title };
      assert(sorted.join(" ") { t => t.seconds.toString() } == "2 4 1 3");
    }

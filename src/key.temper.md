# Smart Sort Keys

A smart sort key is a string that sorts, by plain comparison of code
points, exactly as its source string sorts in smart order:
`compareSmart(a, b)` and `smartKey(a) <=> smartKey(b)` always have
the same sign, and so do an `Order`'s `compare` and `key`. Keys are made once per string, so sorting by them avoids
redoing the smart comparison for every pair, and they can be stored
and sorted anywhere that compares strings, such as a database column
with `ORDER BY`.

Key code points are all below U+D800, where comparing UTF-16 code units
(JavaScript, Java, C#), UTF-8 bytes (Rust, C++), and code points (Python)
all agree, and none is U+0000. A key is usually about as long as its
string: one code point for the options, one per letter, and one more
per number, plus a little for each uppercase or accented letter.

Keys are the same in every language, so they can be stored and shared,
which makes their layout part of Ordable's API: once keys are stored,
changing the layout would misorder them, so any change needs a new major
version, or a new function beside these. The tour prints one, which
checks that every language agrees.

    export let smartKey(s: String): String { smart.key(s) }

## Layout

A key starts with a header of two code points. The first is the key
format, counting from `0`, for this layout; a later layout would be
`1`, and so on, so keys from different formats are easy to tell apart,
and stored keys can be checked before they're compared. The
second names the options, so keys made with different options never pass
for each other: `0` for the default, then plus 1 for `upperFirst`
(unless case is ignored), plus 2 for `Casing.first`, plus 4 for
`ignoreAccents`, plus 8 for `Casing.ignored`, and plus 16 for
`ignoreNumberForms`, leaving room within ASCII for options to come (up
to 63). Neither is shifted (below). Then come the
levels of [the comparison](smart.temper.md) in turn, set apart by
U+0001, which is below every other code point used:
1. **Letters and numbers:** for each character other than a digit, its
   base letter, folded fully (so `ß` gives `s s`), plus its case's
   weight times 0x110000 with `Casing.first`; for each run of digits, its value. A value is its count of
   significant digits, then those digits.
2. **Leading zeros:** the count for each run of digits.
3. **Scripts:** for each run of digits, its zero's distance from ASCII
   `0`, so `1` before `١`.
4. **Accents:** for each character other than a digit, 0 if it has no
   accent, else its case folding.
5. **Case:** for each character other than a digit, 0 or 1, whichever
   case comes first being 0.
6. **Code points:** for each character other than a digit, 0, or itself
   if it's an odd form like the Kelvin sign, or 1 if it's written with
   combining marks (unless accents are ignored).

A letter's combining marks add nothing to the first level, compose with
it for the later levels as `compareMarks` reads them, and each mark that
doesn't compose is an entry of its own in the later levels.

A level an option ignores is left empty (the case level with
`Casing.first`, which has case in the first level, and the leading zeros
and scripts levels with `ignoreNumberForms`), so strings that compare
equal get the same key.

So the levels after the first hold numbers where 0 is usual, and the
comparison reads a string that runs out as 0s. Then each level leaves
out its trailing 0s, and the key leaves out its trailing empty levels,
separators and all, without changing the order. Most keys are just the
header and the first level: `smartKey("file10")` is `0 0 f i l e 2 1
0` (the letters and digits shifted), where an uppercase letter adds the case level up to
it, and an accent the accents level.

Every code point is shifted up by 3, past the separator. Then digits
and counts in the first level land on the shifted ASCII digits, which no
other character can, so a number sorts against a character just as an
ASCII digit would. A count there uses a digit per 9 and then the rest,
as `9 9 4` for 22, which keeps counts in order however long they get and
tells where each ends. Code points from U+D7FC up, shifted past U+D7FF,
become U+D7FF and then two digits in base 0x7F00, at U+0100 up, which
keeps them in order too.

    let shift = 3;
    let separator = 1;

    let keyWith(s: String, order: Order): String {
      let marked = !order.ignoreAccents;
      let formed = !order.ignoreNumberForms;
      let first = casesFirst(order);
      let coded = !ignoresCase(order);
      let cased = coded && !first;
      let main = new StringBuilder();
      let zeros = new StringBuilder();
      let scripts = new StringBuilder();
      let marks = new StringBuilder();
      let cases = new StringBuilder();
      let codes = new StringBuilder();
      // Zero weights held back from each level until a nonzero one follows.
      var zerosHeld = 0;
      var scriptsHeld = 0;
      var marksHeld = 0;
      var casesHeld = 0;
      var codesHeld = 0;
      var i = String.begin;
      var rest = -1;
      // With Casing.first, the case weight of the character a rest is from.
      var lead = 0;
      while (rest >= 0 || s.hasIndex(i)) {
        if (rest >= 0) {
          appendCodePoint(main, fullFolds[rest] + lead);
          rest = nextRest(rest);
          continue;
        }
        let zero = digitZero(s[i]);
        if (zero >= 0) {
          var at = i;
          var count = 0;
          while (s.hasIndex(at) && s[at] == zero) {
            count += 1;
            at = s.next(at);
          }
          if (formed) {
            zerosHeld = addWeight(zeros, zerosHeld, count);
            scriptsHeld = addWeight(scripts, scriptsHeld, zero - char'0');
          }
          appendCount(main, s.countBetween(at, digitsEnd(s, at, zero)));
          while (s.hasIndex(at) && isDigitOf(s[at], zero)) {
            appendCodePoint(main, char'0' + (s[at] - zero));
            at = s.next(at);
          }
          i = at;
        } else {
          let c = s[i];
          i = s.next(i);
          lead = leadWeight(c, first, order);
          appendCodePoint(main, firstUnit(c) + lead);
          rest = foldRest(c);
          // The marks after `c` that compose with it, as `compareMarks` reads them.
          var composed = c;
          var decomposed = false;
          while (s.hasIndex(i) && isMark(s[i])) {
            let next = compose(composed, s[i]);
            if (next < 0) {
              break;
            }
            composed = next;
            decomposed = true;
            i = s.next(i);
          }
          if (composed < 0x80) {
            // ASCII has no accents or odd forms, so only case can say anything.
            marksHeld += 1;
            codesHeld += 1;
          } else {
            if (marked) {
              marksHeld = addWeight(marks, marksHeld, markWeight(composed));
            }
            if (coded) {
              codesHeld = addWeight(codes, codesHeld, codeWeight(c, decomposed && marked));
            }
          }
          if (cased) {
            let caseOf = caseWeight(c, order);
            if (caseOf == 0) {
              casesHeld += 1;
            } else {
              casesHeld = addWeight(cases, casesHeld, caseOf);
            }
          }
          // Marks that don't compose are entries of their own after the
          // first level: their accent weight is themselves, and they have no
          // case or odd form.
          while (s.hasIndex(i) && isMark(s[i])) {
            if (marked) {
              marksHeld = addWeight(marks, marksHeld, s[i]);
            }
            casesHeld += 1;
            codesHeld += 1;
            i = s.next(i);
          }
        }
      }
      let key = new StringBuilder();
      key.appendCodePoint(keyFormat) orelse panic();
      key.appendCodePoint(optionsCode(order)) orelse panic();
      key.append(main.toString());
      let levels: List<StringBuilder> = [zeros, scripts, marks, cases, codes];
      let sections: List<String> = levels.map { level => level.toString() };
      // Empty sections at the end are left out, separators and all.
      var last = sections.length - 1;
      while (last >= 0 && sections[last].isEmpty) {
        last -= 1;
      }
      for (var k = 0; k <= last; k += 1) {
        key.appendCodePoint(separator) orelse panic();
        key.append(sections[k]);
      }
      key.toString()
    }

Adds `weight` to a level, but holds back 0s until a nonzero weight
follows them, so a level ends at its last nonzero weight. Returns how
many 0s are held now.

    let addWeight(level: StringBuilder, held: Int, weight: Int): Int {
      if (weight == 0) {
        return held + 1;
      }
      for (var k = 0; k < held; k += 1) {
        appendCodePoint(level, 0);
      }
      appendCodePoint(level, weight);
      0
    }

The first code point of every key in this layout: format 0.

    let keyFormat = char'0';

    let optionsCode(order: Order): Int {
      char'0' +
        (if (order.upperFirst && !ignoresCase(order)) { 1 } else { 0 }) +
        (if (casesFirst(order)) { 2 } else { 0 }) +
        (if (order.ignoreAccents) { 4 } else { 0 }) +
        (if (ignoresCase(order)) { 8 } else { 0 }) +
        (if (order.ignoreNumberForms) { 16 } else { 0 })
    }

    let appendCount(builder: StringBuilder, count: Int): Void {
      var rest = count;
      while (rest >= 9) {
        appendCodePoint(builder, char'9');
        rest -= 9;
      }
      appendCodePoint(builder, char'0' + rest);
    }

    let appendCodePoint(builder: StringBuilder, c: Int): Void {
      let shifted = c + shift;
      if (shifted < 0xD7FF) {
        builder.appendCodePoint(shifted) orelse panic();
      } else {
        let past = shifted - 0xD7FF;
        builder.appendCodePoint(0xD7FF) orelse panic();
        builder.appendCodePoint(0x100 + (past / 0x7F00 orelse panic())) orelse panic();
        builder.appendCodePoint(0x100 + (past % 0x7F00 orelse panic())) orelse panic();
      }
    }

## Tests

Keys order strings exactly as the comparisons do, on the generated
strings from the [order properties](properties.temper.md), plus strings
with code points far past the separator's shift.

    let checkKeys(
      test: Test,
      compare: fn (String, String): Int,
      key: fn (String): String,
    ): Void {
      let gen = new Strings(2);
      let builder = new ListBuilder<String>();
      for (var i = 0; i < generatedCount; i += 1) {
        builder.add(gen.next(6));
      }
      builder.add("\u{D7FB}");
      builder.add("\u{D7FC}");
      builder.add("\u{E000}");
      builder.add("\u{FFFF}");
      builder.add("\u{10000}a");
      builder.add("\u{10FFFF}");
      builder.add("x99999999999999999999999");
      builder.add("x123456789012345678901234567890");
      let strings = builder.toList();
      let keys = strings.map(key);
      for (var i = 0; i < strings.length; i += 1) {
        for (var j = 0; j < strings.length; j += 1) {
          let expected = sign(compare(strings[i], strings[j]));
          let actual = sign(keys[i] <=> keys[j]);
          assert(expected == actual) {
            "${strings[i]} vs ${strings[j]}: compare ${expected.toString()} but keys ${actual.toString()}"
          }
        }
      }
    }

    test("keys order as compareSmart") { test =>
      checkKeys(test, fn (a: String, b: String): Int { compareSmart(a, b) }, fn (s: String): String { smartKey(s) });
    }

    test("keys order as each option's compare") { test =>
      for (let order of [upperOrder, firstOrder, firstUpperOrder, accentlessOrder, caselessOrder, baseOrder, formlessOrder]) {
        checkKeys(test, fn (a: String, b: String): Int { order.compare(a, b) }, fn (s: String): String { order.key(s) });
      }
    }

Exact keys, since stored keys depend on the layout staying the same.
Code points are in hexadecimal.

    let keyCodes(key: String): String {
      let codes = new ListBuilder<String>();
      var i = String.begin;
      while (key.hasIndex(i)) {
        codes.add(key[i].toString(16));
        i = key.next(i);
      }
      codes.toList().join(" ") { c => c }
    }

    test("exact keys") {
      // Just the header: the format, then the options.
      assert(keyCodes(smartKey("")) == "30 30");
      // Letters and a number (shifted by 3), and nothing else to say.
      assert(keyCodes(smartKey("file10")) == "30 30 69 6c 6f 68 35 34 33");
      // A run's leading zeros go after the first separator.
      assert(keyCodes(smartKey("a007")) == "30 30 64 34 3a 1 5");
      // Digits in another script, whose zero (from ASCII 0) goes after the second.
      assert(keyCodes(smartKey("x\u{662}\u{661}")) == "30 30 7b 35 35 34 1 1 633");
      // A count of 10 digits is 9 then 1.
      assert(keyCodes(smartKey("1234567890")) == "30 30 3c 34 34 35 36 37 38 39 3a 3b 3c 33");
      // é is e in the first level, and itself in the accents level.
      assert(keyCodes(smartKey("\u{E9}")) == "30 30 68 1 1 1 ec");
      // Folded fully first (ß to s s), case folded for accents.
      assert(keyCodes(smartKey("\u{DF}")) == "30 30 76 76 1 1 1 e2");
      // A is uppercase, 1 in the case level by default, 0 with upperFirst.
      assert(keyCodes(smartKey("Ab")) == "30 30 64 65 1 1 1 1 4");
      assert(keyCodes(upperOrder.key("Ab")) == "30 31 64 65 1 1 1 1 3 4");
      // Grouped by case: the case that comes second adds 0x110000 to the
      // first level, and there's no case level.
      assert(keyCodes(firstOrder.key("Ab")) == "30 32 d7ff 120 4965 65");
      assert(keyCodes(firstUpperOrder.key("Ab")) == "30 33 64 d7ff 120 4966");
      // The Kelvin sign is k, uppercase, and an odd form.
      assert(keyCodes(smartKey("\u{212A}")) == "30 30 6e 1 1 1 1 4 1 212d");
      // Ignoring accents leaves the accents level empty.
      assert(keyCodes(accentlessOrder.key("\u{C9}")) == "30 34 68 1 1 1 1 4");
      // Ignoring case leaves out the last two levels, and upperFirst.
      assert(keyCodes(caselessOrder.key("\u{C9}")) == "30 38 68 1 1 1 ec");
      assert(keyCodes(new Order(Casing.ignored, true, false).key("\u{C9}")) == "30 38 68 1 1 1 ec");
      assert(keyCodes(baseOrder.key("\u{C9}T\u{C9}")) == keyCodes(baseOrder.key("ete")));
      // Ignoring number forms leaves the leading zeros and scripts levels empty.
      assert(keyCodes(smartKey("x01")) == "30 30 7b 34 34 1 4");
      assert(keyCodes(formlessOrder.key("x01")) == "30 40 7b 34 34");
      assert(keyCodes(formlessOrder.key("x\u{661}")) == "30 40 7b 34 34");
      // Past U+D7FB: U+D7FF, then two digits in base 0x7F00 from U+0100.
      assert(keyCodes(smartKey("\u{1F600}")) == "30 30 d7ff 102 2104");
    }

    test("keys stay below surrogates and above U+0000") {
      for (let s of ["", "a1", "\u{10FFFF}9", "\u{0}"]) {
        let k = smartKey(s);
        var i = String.begin;
        while (k.hasIndex(i)) {
          assert(k[i] > 0 && k[i] < 0xD800);
          i = k.next(i);
        }
      }
    }

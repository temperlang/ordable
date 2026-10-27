# Natural Sort Keys

A natural sort key is a string that sorts, by plain comparison of code
points, exactly as its source string sorts naturally:
`compareNatural(a, b)` and `naturalKey(a) <=> naturalKey(b)` always have
the same sign, and so do an `Order`'s `compare` and `key`. Keys are made once per string, so sorting by them avoids
redoing the natural comparison for every pair, and they can be stored
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

    export let naturalKey(s: String): String { natural.key(s) }

## Layout

A key starts with a letter naming its options, so keys made with
different options never pass for each other: `A` for the default, then
plus 1 for `upperFirst` and plus 2 for `caseSensitive`. Then come the
levels of [the comparison](natural.temper.md) in turn, set apart by
U+0001, which is below every other code point used:
1. **Letters and numbers:** for each character other than a digit, its
   base letter, folded fully unless case-sensitive (so `ß` gives
   `s s`); for each run of digits, its value. A value is its count of
   significant digits, then those digits.
2. **Leading zeros:** the count for each run of digits.
3. **Scripts:** for each run of digits, its zero's distance from ASCII
   `0`, so `1` before `١`.
4. **Accents:** for each character other than a digit, 0 if it has no
   accent, else its case folding (unless case-sensitive).
5. **Case,** unless case-sensitive: for each character other than a
   digit, 0 or 1, whichever case comes first being 0.
6. **Code points,** unless case-sensitive: for each character other
   than a digit, 0, or itself if it's an odd form like the Kelvin sign.

So the levels after the first hold numbers where 0 is usual, and the
comparison reads a string that runs out as 0s. Then each level leaves
out its trailing 0s, and the key leaves out its trailing empty levels,
separators and all, without changing the order. Most keys are just the
options letter and the first level: `naturalKey("file10")` is `A f i l
e 2 1 0` (shifted), where an uppercase letter adds the case level up to
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
      let fold = !order.caseSensitive;
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
      while (rest >= 0 || s.hasIndex(i)) {
        if (rest >= 0) {
          appendCodePoint(main, fullFolds[rest]);
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
          zerosHeld = addWeight(zeros, zerosHeld, count);
          scriptsHeld = addWeight(scripts, scriptsHeld, zero - char'0');
          appendCount(main, s.countBetween(at, digitsEnd(s, at, zero)));
          while (s.hasIndex(at) && isDigitOf(s[at], zero)) {
            appendCodePoint(main, char'0' + (s[at] - zero));
            at = s.next(at);
          }
          i = at;
        } else {
          let c = s[i];
          i = s.next(i);
          let unit = firstUnit(c, fold);
          rest = foldRest(c, fold);
          appendCodePoint(main, unit);
          if (c < 0x80) {
            // ASCII has no accents or odd forms, so only case can say anything.
            marksHeld += 1;
            codesHeld += 1;
          } else {
            marksHeld = addWeight(marks, marksHeld, plainOr(if (fold) { foldCase(c) } else { c }, unit, rest));
            codesHeld = addWeight(codes, codesHeld, codeWeight(c));
          }
          if (fold) {
            let caseOf = caseWeight(c, order);
            if (caseOf == 0) {
              casesHeld += 1;
            } else {
              casesHeld = addWeight(cases, casesHeld, caseOf);
            }
          }
        }
      }
      let key = new StringBuilder();
      key.appendCodePoint(optionsLetter(order)) orelse panic();
      key.append(main.toString());
      let levels: List<StringBuilder> = if (fold) { [zeros, scripts, marks, cases, codes] } else { [zeros, scripts, marks] };
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

    let optionsLetter(order: Order): Int {
      char'A' + (if (order.upperFirst) { 1 } else { 0 }) + (if (order.caseSensitive) { 2 } else { 0 })
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
      for (var i = 0; i < 200; i += 1) {
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

    test("keys order as compareNatural") { test =>
      checkKeys(test, fn (a: String, b: String): Int { compareNatural(a, b) }, fn (s: String): String { naturalKey(s) });
    }

    test("keys order as each option's compare") { test =>
      for (let order of [upperOrder, sensitiveOrder]) {
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
      // Just the options letter.
      assert(keyCodes(naturalKey("")) == "41");
      // Letters and a number (shifted by 3), and nothing else to say.
      assert(keyCodes(naturalKey("file10")) == "41 69 6c 6f 68 35 34 33");
      // A run's leading zeros go after the first separator.
      assert(keyCodes(naturalKey("a007")) == "41 64 34 3a 1 5");
      // Digits in another script, whose zero (from ASCII 0) goes after the second.
      assert(keyCodes(naturalKey("x\u{662}\u{661}")) == "41 7b 35 35 34 1 1 633");
      // A count of 10 digits is 9 then 1.
      assert(keyCodes(naturalKey("1234567890")) == "41 3c 34 34 35 36 37 38 39 3a 3b 3c 33");
      // é is e in the first level, and itself in the accents level.
      assert(keyCodes(naturalKey("\u{E9}")) == "41 68 1 1 1 ec");
      // Folded fully first (ß to s s), case folded for accents.
      assert(keyCodes(naturalKey("\u{DF}")) == "41 76 76 1 1 1 e2");
      // A is uppercase, 1 in the case level by default, 0 with upperFirst.
      assert(keyCodes(naturalKey("Ab")) == "41 64 65 1 1 1 1 4");
      assert(keyCodes(upperOrder.key("Ab")) == "42 64 65 1 1 1 1 3 4");
      // Case-sensitive: nothing folded, and no case or code point levels.
      assert(keyCodes(sensitiveOrder.key("Ab")) == "43 44 65");
      // The Kelvin sign is k, uppercase, and an odd form.
      assert(keyCodes(naturalKey("\u{212A}")) == "41 6e 1 1 1 1 4 1 212d");
      // Past U+D7FB: U+D7FF, then two digits in base 0x7F00 from U+0100.
      assert(keyCodes(naturalKey("\u{1F600}")) == "41 d7ff 102 2104");
    }

    test("keys stay below surrogates and above U+0000") {
      for (let s of ["", "a1", "\u{10FFFF}9", "\u{0}"]) {
        let k = naturalKey(s);
        var i = String.begin;
        while (k.hasIndex(i)) {
          assert(k[i] > 0 && k[i] < 0xD800);
          i = k.next(i);
        }
      }
    }

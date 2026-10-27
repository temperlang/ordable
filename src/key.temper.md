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
all agree, and none is U+0000. A key is several times as long as its
string: by default, a string of n letters gives 4n + 6 code points.

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
3. **Scripts:** the zero of each run of digits, so `1` before `١`.
4. **Accents:** each character other than a digit, case folded unless
   case-sensitive.
5. **Case,** unless case-sensitive: for each character other than a
   digit, 0 or 1, whichever case comes first being 0.
6. **Code points,** unless case-sensitive: each character other than a
   digit, as it is.

Every code point is shifted up by 3, past the separator. Then digits
and counts land on the shifted ASCII digits, which no other character
can, so a number sorts against a character just as an ASCII digit
would. A count uses a digit per 9 and then the rest, as `9 9 4` for 22,
which keeps counts in order however long they get and tells where each
ends. Code points from U+D7FC up, shifted past U+D7FF, become U+D7FF and
then two digits in base 0x7F00, at U+0100 up.

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
          appendCount(zeros, count);
          appendCodePoint(scripts, zero);
          appendCount(main, s.countBetween(at, digitsEnd(s, at, zero)));
          while (s.hasIndex(at) && isDigitOf(s[at], zero)) {
            appendCodePoint(main, char'0' + (s[at] - zero));
            at = s.next(at);
          }
          i = at;
        } else {
          let c = s[i];
          i = s.next(i);
          appendCodePoint(marks, markKey(c, order));
          if (fold) {
            appendCodePoint(cases, caseKey(c, order));
            appendCodePoint(codes, c);
          }
          appendCodePoint(main, firstUnit(c, fold));
          rest = foldRest(c, fold);
        }
      }
      let key = new StringBuilder();
      key.appendCodePoint(optionsLetter(order)) orelse panic();
      key.append(main.toString());
      let sections = if (fold) { [zeros, scripts, marks, cases, codes] } else { [zeros, scripts, marks] };
      for (let section of sections) {
        key.appendCodePoint(separator) orelse panic();
        key.append(section.toString());
      }
      key.toString()
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
      // The options letter, then six empty levels.
      assert(keyCodes(naturalKey("")) == "41 1 1 1 1 1");
      // Letters and numbers, zeros, scripts, accents, case (all lowercase,
      // so 0, shifted to 3), and code points.
      assert(keyCodes(naturalKey("file10")) == "41 69 6c 6f 68 35 34 33 1 33 1 33 1 69 6c 6f 68 1 3 3 3 3 1 69 6c 6f 68");
      // A run's leading zeros go after the first separator.
      assert(keyCodes(naturalKey("a007")) == "41 64 34 3a 1 35 1 33 1 64 1 3 1 64");
      // Digits in another script, whose zero goes after the second separator.
      assert(keyCodes(naturalKey("x\u{662}\u{661}")) == "41 7b 35 35 34 1 33 1 663 1 7b 1 3 1 7b");
      // A count of 10 digits is 9 then 1.
      assert(keyCodes(naturalKey("1234567890")) == "41 3c 34 34 35 36 37 38 39 3a 3b 3c 33 1 33 1 33 1 1 1");
      // é is e in the first level, and itself in the accents level.
      assert(keyCodes(naturalKey("\u{E9}")) == "41 68 1 1 1 ec 1 3 1 ec");
      // Folded fully first (ß to s s), case folded for accents.
      assert(keyCodes(naturalKey("\u{DF}")) == "41 76 76 1 1 1 e2 1 3 1 e2");
      // A is uppercase, 1 in the case level by default, 0 with upperFirst.
      assert(keyCodes(naturalKey("Ab")) == "41 64 65 1 1 1 64 65 1 4 3 1 44 65");
      assert(keyCodes(upperOrder.key("Ab")) == "42 64 65 1 1 1 64 65 1 3 4 1 44 65");
      // Case-sensitive: nothing folded, and no case or code point levels.
      assert(keyCodes(sensitiveOrder.key("Ab")) == "43 44 65 1 1 1 44 65");
      // Past U+D7FB: U+D7FF, then two digits in base 0x7F00 from U+0100.
      assert(keyCodes(naturalKey("\u{1F600}")) == "41 d7ff 102 2104 1 1 1 d7ff 102 2104 1 3 1 d7ff 102 2104");
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

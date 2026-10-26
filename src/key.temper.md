# Natural Sort Keys

A natural sort key is a string that sorts, by plain comparison of code
points, exactly as its source string sorts naturally:
`compareNatural(a, b)` and `naturalKey(a) <=> naturalKey(b)` always have
the same sign. Keys are made once per string, so sorting by them avoids
redoing the natural comparison for every pair, and they can be stored
and sorted anywhere that compares strings, such as a database column
with `ORDER BY`.

Key code points are all below U+D800, where comparing UTF-16 code units
(JavaScript, Java, C#), UTF-8 bytes (Rust, C++) and code points (Python)
all agree, and none is U+0000. A key is no shorter than its string and,
with digits, a little longer.

    export let naturalKey(s: String): String { keyWith(s, false) }

    export let naturalKeyIgnoringCase(s: String): String { keyWith(s, true) }

## Layout

A key is the main order, then each tiebreak in turn, set apart by
U+0001, which is below every other code point used:

1. **Main:** for each character other than a digit, its sort key (case
   folded when ignoring case); for each run of digits, its value. A
   value is its count of significant digits, then those digits.
2. **Leading zeros:** the count for each run of digits.
3. **Scripts:** the zero of each run of digits, so `1` before `١`.
4. **Case,** when ignoring case: each character other than a digit, as
   it is.

Every code point is shifted up by 3, past the separator. Then digits
and counts land on the shifted ASCII digits, which no other character
can, so a number sorts against a character just as an ASCII digit
would. A count uses a digit per 9 and then the rest, as `9 9 4` for 22,
which keeps counts in order however long they get and tells where each
ends. Code points from U+D7FC up, shifted past U+D7FF, become U+D7FF and
then two digits in base 0x7F00, at U+0100 up.

    let shift = 3;
    let separator = 1;

    let keyWith(s: String, ignoreCase: Boolean): String {
      let main = new StringBuilder();
      let zeros = new StringBuilder();
      let scripts = new StringBuilder();
      let cases = new StringBuilder();
      var i = String.begin;
      while (s.hasIndex(i)) {
        let c = s[i];
        let zero = digitZero(c);
        if (zero >= 0) {
          var count = 0;
          while (s.hasIndex(i) && s[i] == zero) {
            count += 1;
            i = s.next(i);
          }
          appendCount(zeros, count);
          appendCodePoint(scripts, zero);
          let end = digitsEnd(s, i, zero);
          appendCount(main, s.countBetween(i, end));
          while (s.hasIndex(i) && isDigitOf(s[i], zero)) {
            appendCodePoint(main, char'0' + (s[i] - zero));
            i = s.next(i);
          }
        } else {
          appendCodePoint(main, if (ignoreCase) { foldCase(c) } else { c });
          if (ignoreCase) {
            appendCodePoint(cases, c);
          }
          i = s.next(i);
        }
      }
      main.appendCodePoint(separator) orelse panic();
      main.append(zeros.toString());
      main.appendCodePoint(separator) orelse panic();
      main.append(scripts.toString());
      if (ignoreCase) {
        main.appendCodePoint(separator) orelse panic();
        main.append(cases.toString());
      }
      main.toString()
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

    test("keys order as compareNaturalIgnoringCase") { test =>
      checkKeys(
        test,
        fn (a: String, b: String): Int { compareNaturalIgnoringCase(a, b) },
        fn (s: String): String { naturalKeyIgnoringCase(s) },
      );
    }

    test("keys stay below surrogates and above U+0000") {
      for (let s of ["", "a1", "\u{10FFFF}9", "\u{0}"]) {
        let k = naturalKeyIgnoringCase(s);
        var i = String.begin;
        while (k.hasIndex(i)) {
          assert(k[i] > 0 && k[i] < 0xD800);
          i = k.next(i);
        }
      }
    }

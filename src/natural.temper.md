# Natural Order

People expect `file2` before `file10`, but comparing code points puts
`file10` first, since `1` comes before `2`. Natural order fixes that by
comparing each run of ASCII digits as a number, and everything else by code
point.

## Comparing

Each returns a negative number if `a` comes first, positive if `b` does, and
0 only if the strings are equal. That makes the order total, so sorting
gives the same result whatever order the input was in.

Code points compare as they are, so `B` comes before `a`.

    export let compareNatural(a: String, b: String): Int {
      compareWith(a, b, false)
    }

The same, but ignoring ASCII case, so `a` comes before `B`. Strings that
differ only in case still don't tie: uppercase comes first, as in `A`
before `a`.

    export let compareNaturalIgnoringCase(a: String, b: String): Int {
      compareWith(a, b, true)
    }

## Sorting

A sorted copy, in natural order. Sorting is stable, though with a total
order that only matters for equal strings.

    export let sortNatural(strings: List<String>): List<String> {
      strings.sorted { a, b => compareNatural(a, b) }
    }

    export let sortNaturalIgnoringCase(strings: List<String>): List<String> {
      strings.sorted { a, b => compareNaturalIgnoringCase(a, b) }
    }

## How It Works

Both strings are walked together, a code point or a run of digits at a
time. Numbers compare by value without converting them, so any number of
digits works without overflow: after skipping leading zeros, more digits
means bigger, and equal lengths compare digit by digit.

Two things that don't change the main order are kept as tiebreaks, used
only if everything else is equal: the first difference in leading zeros
(fewer first, so `1` before `01`), and, when ignoring case, the first
difference in case. That keeps the order total.

Only ASCII digits and ASCII letters are special for now. Other decimal
digits and Unicode case folding need tables that Temper doesn't have yet.

    let compareWith(a: String, b: String, ignoreCase: Boolean): Int {
      var i = String.begin;
      var j = String.begin;
      var zeros = 0;
      var cases = 0;
      while (a.hasIndex(i) && b.hasIndex(j)) {
        let x = a[i];
        let y = b[j];
        if (isDigit(x) && isDigit(y)) {
          var zerosA = 0;
          while (a.hasIndex(i) && a[i] == char'0') {
            zerosA += 1;
            i = a.next(i);
          }
          var zerosB = 0;
          while (b.hasIndex(j) && b[j] == char'0') {
            zerosB += 1;
            j = b.next(j);
          }
          let endA = digitsEnd(a, i);
          let endB = digitsEnd(b, j);
          let lengthA = a.countBetween(i, endA);
          let lengthB = b.countBetween(j, endB);
          if (lengthA != lengthB) {
            return sign(lengthA - lengthB);
          }
          while (a.hasIndex(i) && isDigit(a[i])) {
            let diff = a[i] - b[j];
            if (diff != 0) {
              return sign(diff);
            }
            i = a.next(i);
            j = b.next(j);
          }
          if (zeros == 0) {
            zeros = zerosA - zerosB;
          }
        } else {
          let diff = if (ignoreCase) { lowerAscii(x) - lowerAscii(y) } else { x - y };
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
      } else {
        sign(cases)
      }
    }

    let isDigit(c: Int): Boolean { c >= char'0' && c <= char'9' }

    let digitsEnd(s: String, start: StringIndex): StringIndex {
      var i = start;
      while (s.hasIndex(i) && isDigit(s[i])) {
        i = s.next(i);
      }
      i
    }

    let lowerAscii(c: Int): Int {
      if (c >= char'A' && c <= char'Z') { c + 32 } else { c }
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

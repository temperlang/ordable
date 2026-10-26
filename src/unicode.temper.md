# Unicode

Character facts that natural order needs, from generated tables
([unicode-tables](unicode-tables.temper.md)). They're kept apart from the
rest so they could move to a shared Unicode library or Temper's core
later, and they stay internal until that's decided.

## Decimal Digits

Every Unicode decimal digit is in a run of ten, from 0 to 9, so a digit's
value is its distance from its run's zero. This gives that zero, or -1 if
`c` isn't a decimal digit. ASCII is checked first, so most text never
reaches the table, and the rest is a binary search over 68 runs.

    let digitZero(c: Int): Int {
      if (c < 0x660) {
        return if (c >= char'0' && c <= char'9') { char'0' } else { -1 };
      }
      var low = 0;
      var high = digitZeros.length;
      while (high - low > 1) {
        let middle = (low + high) / 2;
        if (digitZeros[middle] <= c) {
          low = middle;
        } else {
          high = middle;
        }
      }
      let zero = digitZeros[low];
      if (c <= zero + 9) { zero } else { -1 }
    }

Whether `c` is a digit in the run starting at `zero`.

    let isDigitOf(c: Int, zero: Int): Boolean { c >= zero && c <= zero + 9 }

## Case Folding

Folds `c` for comparing without case, with Unicode's simple case folding:
one code point to one, mostly to lowercase, so `Σ`, `σ` and `ς` all fold
to `σ`, and the Kelvin sign `K` to `k`. Full folding, which turns `ß`
into `ss`, would change lengths and is left out. ASCII is checked first,
and the rest is a binary search over the runs in `foldRuns`.

    let foldCase(c: Int): Int {
      if (c < 0x80) {
        return if (c >= char'A' && c <= char'Z') { c + 32 } else { c };
      }
      // Runs are four numbers each: start, count, stride and delta.
      var low = 0;
      var high = foldRuns.length / 4;
      while (high - low > 1) {
        let middle = (low + high) / 2;
        if (foldRuns[middle * 4] <= c) {
          low = middle;
        } else {
          high = middle;
        }
      }
      let start = foldRuns[low * 4];
      let offset = c - start;
      let stride = foldRuns[low * 4 + 2];
      if (
        offset >= 0 && offset < foldRuns[low * 4 + 1] * stride &&
        (stride == 1 || (offset & 1) == 0)
      ) {
        c + foldRuns[low * 4 + 3]
      } else {
        c
      }
    }

## Tests

    test("decimal digits") {
      assert(digitZero(char'0') == char'0');
      assert(digitZero(char'9') == char'0');
      assert(digitZero(char'a') == -1);
      assert(digitZero(0x2F) == -1);
      // Arabic-Indic, Devanagari and fullwidth digits.
      assert(digitZero(0x662) == 0x660);
      assert(digitZero(0x96F) == 0x966);
      assert(digitZero(0xFF15) == 0xFF10);
      // Just past a run, and before the first run past ASCII.
      assert(digitZero(0x66A) == -1);
      assert(digitZero(0x65F) == -1);
      // The last run, and past it.
      assert(digitZero(0x1FBF9) == 0x1FBF0);
      assert(digitZero(0x1FBFA) == -1);
      // Mathematical digits: runs right next to each other.
      assert(digitZero(0x1D7D7) == 0x1D7CE);
      assert(digitZero(0x1D7D8) == 0x1D7D8);
    }

    test("case folding") {
      assert(foldCase(char'A') == char'a');
      assert(foldCase(char'a') == char'a');
      assert(foldCase(char'@') == char'@');
      assert(foldCase(char'[') == char'[');
      // Latin-1, then pairs alternating upper and lower, and their gaps.
      assert(foldCase(0xC9) == 0xE9); // É
      assert(foldCase(0xD7) == 0xD7); // ×
      assert(foldCase(0x100) == 0x101); // Ā
      assert(foldCase(0x101) == 0x101);
      // Greek sigmas, Cyrillic, and signs that fold elsewhere.
      assert(foldCase(0x3A3) == 0x3C3);
      assert(foldCase(0x3C2) == 0x3C3);
      assert(foldCase(0x416) == 0x436); // Ж
      assert(foldCase(0x212A) == char'k'); // Kelvin
      assert(foldCase(0x1E9E) == 0xDF); // ẞ to ß, but ß stays
      assert(foldCase(0xDF) == 0xDF);
      // Cherokee folds to uppercase.
      assert(foldCase(0xAB70) == 0x13A0);
      // Below the first run past ASCII, and the last run and past it.
      assert(foldCase(0xB4) == 0xB4);
      assert(foldCase(0x1E900) == 0x1E922);
      assert(foldCase(0x1E922) == 0x1E922);
      assert(foldCase(0x10FFFF) == 0x10FFFF);
    }

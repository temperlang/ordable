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
one code point to one, mostly to lowercase, so `Σ`, `σ`, and `ς` all fold
to `σ`, and the Kelvin sign `K` to `k`. Full folding, which turns `ß`
into `ss`, would change lengths and is left out. ASCII is checked first,
and the rest is a binary search over the runs in `foldRuns`.

    let foldCase(c: Int): Int {
      if (c < 0x80) {
        return if (c >= char'A' && c <= char'Z') { c + 32 } else { c };
      }
      // Runs are four numbers each: start, count, stride, and delta.
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

## Accents

The letter under any accents on `c`, as `e` for `é` and `u` for `ǖ`, from
canonical decompositions into a letter and combining marks. Others are
their own base, including letters like `ø` that Unicode doesn't
decompose.

    let baseLetter(c: Int): Int {
      if (c < 0xC0) {
        return c;
      }
      let at = findEntry(basePairs, 2, c);
      if (at >= 0) { basePairs[at + 1] } else { c }
    }

## Full Case Folding

Full case folding, which can give more than one code point, as `ss` for
`ß`, adds them to `units`. Others fold as `foldCase` does.

    let addFullFold(units: ListBuilder<Int>, c: Int): Void {
      if (c >= 0x80) {
        let at = findEntry(fullFolds, 4, c);
        if (at >= 0) {
          for (var k = 1; k < 4; k += 1) {
            let unit = fullFolds[at + k];
            if (unit != 0) {
              units.add(unit);
            }
          }
          return;
        }
      }
      units.add(foldCase(c));
    }

The start of the entry for `c` in a sorted table of `width` numbers per
entry, the first being its key, or -1 if there's none.

    let findEntry(table: List<Int>, width: Int, c: Int): Int {
      var low = 0;
      var high = (table.length / width) orelse panic();
      while (high - low > 1) {
        let middle = (low + high) / 2;
        if (table[middle * width] <= c) {
          low = middle;
        } else {
          high = middle;
        }
      }
      if (high > 0 && table[low * width] == c) { low * width } else { -1 }
    }

## Tests

    test("decimal digits") {
      assert(digitZero(char'0') == char'0');
      assert(digitZero(char'9') == char'0');
      assert(digitZero(char'a') == -1);
      assert(digitZero(0x2F) == -1);
      // Arabic-Indic, Devanagari, and fullwidth digits.
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

    test("base letters") {
      assert(baseLetter(char'e') == char'e');
      assert(baseLetter(0xE9) == char'e'); // é
      assert(baseLetter(0xC9) == char'E'); // É keeps its case
      assert(baseLetter(0x1D6) == char'u'); // ǖ, two marks deep
      assert(baseLetter(0xF8) == 0xF8); // ø doesn't decompose
      assert(baseLetter(0x3AC) == 0x3B1); // ά to α
      assert(baseLetter(0x419) == 0x418); // Й to И
    }

    test("full case folding") {
      let units = new ListBuilder<Int>();
      addFullFold(units, 0xDF); // ß
      addFullFold(units, 0x1E9E); // ẞ
      addFullFold(units, char'A');
      addFullFold(units, 0xFB01); // ﬁ
      assert(units.toList().join(" ") { u => u.toString(16) } == "73 73 73 73 61 66 69");
    }

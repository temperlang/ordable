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

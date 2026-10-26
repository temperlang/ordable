# Order Properties

Tests that the comparisons are a total order, on many generated strings
rather than hand-picked ones: each string equals only itself, swapping
the arguments flips the sign, and the order is transitive. Sorting must
then give one answer whatever the input order. The strings mix the cases
the rules care about: digits from several scripts, leading zeros, letters
in both cases and several scripts, and other characters.

A small fixed generator keeps the strings the same in every backend and
every run, and its numbers stay small enough to never overflow.

    class Strings(private var state: Int) {
      public next(maxLength: Int): String {
        let builder = new StringBuilder();
        let length = pick(maxLength + 1);
        for (var i = 0; i < length; i += 1) {
          builder.appendCodePoint(alphabet[pick(alphabet.length)]) orelse panic();
        }
        builder.toString()
      }

      public pick(n: Int): Int {
        state = (state * 75 + 74) % 65537;
        (state % n) orelse panic()
      }
    }

ASCII digits and zeros, Arabic-Indic and fullwidth digits, letters in
both cases (including `ß`, `ẞ`, Greek sigmas and Cyrillic), and a space,
a dot and a dash.

    let alphabet: List<Int> = [
      char'0', char'0', char'1', char'2', char'9',
      0x660, 0x661, 0x662, 0xFF10, 0xFF12,
      char'a', char'A', char'b', char'B', char'z',
      0xE9, 0xC9, 0xDF, 0x1E9E, 0x3A3, 0x3C3, 0x3C2, 0x416, 0x436,
      char' ', char'.', char'-',
    ];

    let checkTotalOrder(test: Test, compare: fn (String, String): Int): Void {
      let gen = new Strings(1);
      let builder = new ListBuilder<String>();
      for (var i = 0; i < 300; i += 1) {
        builder.add(gen.next(6));
      }
      let strings = builder.toList();
      for (var i = 0; i < strings.length; i += 1) {
        let a = strings[i];
        assert(compare(a, a) == 0) { "${a} not equal to itself" }
        for (var j = 0; j < strings.length; j += 1) {
          let b = strings[j];
          let ab = compare(a, b);
          assert(sign(ab) == -sign(compare(b, a))) { "${a} and ${b} not antisymmetric" }
          if (ab == 0) {
            assert(a == b) { "${a} and ${b} compare equal" }
          } else {
            assert(a != b) { "${a} compares ${ab.toString()} to itself" }
          }
        }
      }
      // Transitivity over sorted neighbors and random triples.
      let sorted = strings.sorted { a, b => compare(a, b) };
      for (var i = 0; i + 1 < sorted.length; i += 1) {
        assert(compare(sorted[i], sorted[i + 1]) <= 0) { "sort out of order at ${i.toString()}" }
      }
      for (var k = 0; k < 3000; k += 1) {
        let a = strings[gen.pick(strings.length)];
        let b = strings[gen.pick(strings.length)];
        let c = strings[gen.pick(strings.length)];
        if (compare(a, b) <= 0 && compare(b, c) <= 0) {
          assert(compare(a, c) <= 0) { "${a} <= ${b} <= ${c} but not ${a} <= ${c}" }
        }
      }
      // The same answer from reversed input.
      let reversed = new ListBuilder<String>();
      for (var i = strings.length - 1; i >= 0; i -= 1) {
        reversed.add(strings[i]);
      }
      let again = reversed.toList().sorted { a, b => compare(a, b) };
      assert(again.join("|") { s => s } == sorted.join("|") { s => s }) { "sort depends on input order" }
    }

    test("total order") { test =>
      checkTotalOrder(test) { a, b => compareNatural(a, b) };
    }

    test("total order ignoring case") { test =>
      checkTotalOrder(test) { a, b => compareNaturalIgnoringCase(a, b) };
    }

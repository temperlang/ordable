# /// script
# requires-python = "==3.12.*"  # Python 3.12 has Unicode 15.0.0 (3.13 has 15.1)
# ///
"""Writes src/unicode-tables.temper.md from Python's Unicode data.

    uv run scripts/unicode_tables.py

The data is Python's (`unicodedata`), which must be Unicode
`UNICODE_VERSION`, so tables don't change by accident with the Python
version. Stored smart keys depend on these tables, so moving to a new
Unicode version (raise `UNICODE_VERSION`, then run with a Python that
has it) can change some keys, and a release that does says so.
"""

import unicodedata
from pathlib import Path

UNICODE_VERSION = "15.0.0"
OUT = Path(__file__).parent.parent / "src" / "unicode-tables.temper.md"


def digit_zeros() -> list[int]:
    """The code point of each decimal digit block's zero, checking that every
    block is ten digits in a row and that they cover every decimal digit."""
    zeros = [c for c in range(0x110000) if unicodedata.decimal(chr(c), None) == 0]
    for zero in zeros:
        assert all(unicodedata.decimal(chr(zero + i), None) == i for i in range(10))
    digits = sum(unicodedata.category(chr(c)) == "Nd" for c in range(0x110000))
    assert digits == 10 * len(zeros)
    return zeros


def simple_fold(c: int) -> int:
    """Unicode simple case folding (CaseFolding.txt's C and S mappings),
    derived from Python, which has only full folding: a one-character full
    folding is the simple one; otherwise the simple one, where there is
    one, is the one-character lowercase (as for ẞ to ß)."""
    char = chr(c)
    full = char.casefold()
    if len(full) == 1:
        return ord(full)
    lower = char.lower()
    return ord(lower) if len(lower) == 1 else c


def fold_runs() -> list[tuple[int, int, int, int]]:
    """Case folding as runs of (start, count, stride, delta): code points
    start, start + stride, ... (count of them) each fold to themselves plus
    delta. Stride 2 covers the many blocks where upper and lowercase
    alternate."""
    folds = [
        (c, simple_fold(c)) for c in range(0x110000) if not 0xD800 <= c <= 0xDFFF
    ]
    folds = [(c, f) for c, f in folds if f != c]
    # Spot checks against CaseFolding.txt.
    known = dict(folds)
    assert known[0x1E9E] == 0xDF and 0xDF not in known and 0x130 not in known
    assert known[0x3C2] == 0x3C3 and known[0x212A] == 0x6B and known[0xAB70] == 0x13A0
    runs = []
    i = 0
    while i < len(folds):
        start, fold = folds[i]
        delta = fold - start
        best = (1, 1)
        for stride in (1, 2):
            count = 1
            while (
                i + count < len(folds)
                and folds[i + count][0] == start + stride * count
                and folds[i + count][1] - folds[i + count][0] == delta
            ):
                count += 1
            if count > best[0]:
                best = (count, stride)
        count, stride = best
        runs.append((start, count, stride, delta))
        i += count
    return runs


def base_letter(c: int) -> int:
    """The letter under any accents: canonical decompositions of a
    character then combining marks (category Mn), followed down, as `é`
    to `e` and `ǖ` to `u`. Characters that only decompose to another
    single one, or not into marks, keep themselves."""
    char = chr(c)
    while True:
        decomposition = unicodedata.decomposition(char)
        if not decomposition or decomposition.startswith("<"):
            return ord(char)
        parts = [chr(int(code, 16)) for code in decomposition.split()]
        if len(parts) < 2 or any(unicodedata.category(p) != "Mn" for p in parts[1:]):
            return ord(char)
        char = parts[0]


def base_pairs() -> list[tuple[int, int]]:
    pairs = [(c, base_letter(c)) for c in range(0x110000) if not 0xD800 <= c <= 0xDFFF]
    pairs = [(c, b) for c, b in pairs if b != c]
    assert dict(pairs)[0xE9] == 0x65 and dict(pairs)[0x1D6] == 0x75 and 0xF8 not in dict(pairs)
    assert all(c >= 0xC0 for c, _ in pairs)
    return pairs


def mark_runs() -> list[tuple[int, int]]:
    """Combining marks (category Mn, as `base_letter` uses) as runs of a
    start and a count, in order."""
    runs: list[list[int]] = []
    for c in range(0x110000):
        if 0xD800 <= c <= 0xDFFF or unicodedata.category(chr(c)) != "Mn":
            continue
        if runs and runs[-1][0] + runs[-1][1] == c:
            runs[-1][1] += 1
        else:
            runs.append([c, 1])
    assert runs[0] == [0x300, 0x70]
    return [(start, count) for start, count in runs]


def compositions() -> list[tuple[int, int, int]]:
    """Canonical compositions of a character and one combining mark into one
    code point, as NFC makes them, as `e` and U+0301 to `é`: a base, a mark,
    and the composed code point, sorted by base and then mark. Composing one
    mark at a time, in canonical order, gives `ǖ` from `u`, U+0308, and
    U+0304."""
    found = []
    for c in range(0x110000):
        if 0xD800 <= c <= 0xDFFF:
            continue
        decomposition = unicodedata.decomposition(chr(c))
        if not decomposition or decomposition.startswith("<"):
            continue
        parts = [int(code, 16) for code in decomposition.split()]
        if (len(parts) == 2 and unicodedata.category(chr(parts[1])) == "Mn"
                and unicodedata.normalize("NFC", chr(parts[0]) + chr(parts[1])) == chr(c)):
            found.append((parts[0], parts[1], c))
    found.sort()
    pairs = {(b, m): c for b, m, c in found}
    assert pairs[(0x65, 0x301)] == 0xE9 and pairs[(0xFC, 0x304)] == 0x1D6
    return found


def full_folds() -> list[tuple[int, list[int]]]:
    """Code points whose full case folding is more than one, as `ß` to
    `ss`; at most three."""
    folds = []
    for c in range(0x110000):
        if 0xD800 <= c <= 0xDFFF:
            continue
        full = chr(c).casefold()
        if len(full) > 1:
            assert len(full) <= 3
            folds.append((c, [ord(f) for f in full]))
    assert dict(folds)[0xDF] == [0x73, 0x73] and all(c >= 0x80 for c, _ in folds)
    return folds


def odd_cases() -> list[int]:
    """Code points that fold to the same letter as another of the same case
    and aren't the usual one, as the Kelvin sign `K` beside `K`: the usual
    one is the folding's uppercase (or the lowest, if that isn't one)."""
    groups: dict[int, list[int]] = {}
    for c in range(0x110000):
        if 0xD800 <= c <= 0xDFFF:
            continue
        fold = simple_fold(c)
        if fold != c:
            groups.setdefault(fold, []).append(c)
    odd = []
    for fold, chars in groups.items():
        upper = chr(fold).upper()
        usual = ord(upper) if len(upper) == 1 and ord(upper) in chars else min(chars)
        odd += [c for c in chars if c != usual]
    assert 0x212A in odd and 0x3C2 in odd and 0x4B not in odd and min(odd) == 0xB5
    return sorted(odd)


def rows(values: list[str], per_row: int) -> str:
    lines = [", ".join(values[i : i + per_row]) for i in range(0, len(values), per_row)]
    return ",\n".join(f"      {line}" for line in lines)


def chunks(values: list[str], per_row: int, rows_per_chunk: int = 4) -> str:
    """`runs.addAll([...]);` calls of a few rows each."""
    size = per_row * rows_per_chunk
    calls = []
    for i in range(0, len(values), size):
        part = values[i : i + size]
        lines = [", ".join(part[j : j + per_row]) for j in range(0, len(part), per_row)]
        body = ",\n".join(f"        {line}" for line in lines)
        calls.append(f"      runs.addAll([\n{body},\n      ]);")
    return "\n".join(calls)


def digit_zero_lookup(zeros: list[int], c: int) -> int:
    """The same search as `digitZero` in src/unicode.temper.md."""
    if c < 0x660:
        return 0x30 if 0x30 <= c <= 0x39 else -1
    low, high = 0, len(zeros)
    while high - low > 1:
        middle = (low + high) // 2
        if zeros[middle] <= c:
            low = middle
        else:
            high = middle
    return zeros[low] if c <= zeros[low] + 9 else -1


def fold_lookup(flat: list[int], c: int) -> int:
    """The same search as `foldCase` in src/unicode.temper.md."""
    if c < 0x80:
        return c + 32 if 0x41 <= c <= 0x5A else c
    low, high = 0, len(flat) // 4
    while high - low > 1:
        middle = (low + high) // 2
        if flat[middle * 4] <= c:
            low = middle
        else:
            high = middle
    start, count, stride, delta = flat[low * 4 : low * 4 + 4]
    offset = c - start
    if 0 <= offset < count * stride and (stride == 1 or offset & 1 == 0):
        return c + delta
    return c


def pair_lookup(flat: list[int], width: int, c: int) -> int:
    """The index of `c` in a sorted table of `width` numbers per entry, the
    first being the key, or -1: the same search as `findEntry` in
    src/unicode.temper.md."""
    low, high = 0, len(flat) // width
    while high - low > 1:
        middle = (low + high) // 2
        if flat[middle * width] <= c:
            low = middle
        else:
            high = middle
    return low * width if flat and flat[low * width] == c else -1


def check_lookups(zeros, runs, bases, fulls) -> None:
    """Checks the tables and the Temper code's searches, mirrored above,
    against Python's Unicode data for every code point."""
    flat = [n for run in runs for n in run]
    flat_bases = [n for pair in bases for n in pair]
    flat_fulls = [n for c, units in fulls for n in [c] + units + [0] * (3 - len(units))]
    for c in range(0x110000):
        if 0xD800 <= c <= 0xDFFF:
            continue
        decimal = unicodedata.decimal(chr(c), None)
        assert digit_zero_lookup(zeros, c) == (-1 if decimal is None else c - decimal), hex(c)
        assert fold_lookup(flat, c) == simple_fold(c), hex(c)
        at = pair_lookup(flat_bases, 2, c) if c >= 0xC0 else -1
        assert (flat_bases[at + 1] if at >= 0 else c) == base_letter(c), hex(c)
        at = pair_lookup(flat_fulls, 4, c) if c >= 0x80 else -1
        units = [u for u in flat_fulls[at + 1 : at + 4] if u] if at >= 0 else [simple_fold(c)]
        assert units == [ord(f) for f in chr(c).casefold()] or len(chr(c).casefold()) == 1, hex(c)


def main() -> None:
    if unicodedata.unidata_version != UNICODE_VERSION:
        raise SystemExit(
            f"Python has Unicode {unicodedata.unidata_version}, not {UNICODE_VERSION};"
            " run with a Python that has it, or raise UNICODE_VERSION on purpose"
        )
    zeros = digit_zeros()
    runs = fold_runs()
    bases = base_pairs()
    fulls = full_folds()
    odd = odd_cases()
    marks = mark_runs()
    composed = compositions()
    check_lookups(zeros, runs, bases, fulls)
    fold_values = [
        f"0x{start:X}, {count}, {stride}, {delta}" for start, count, stride, delta in runs
    ]
    OUT.write_text(f"""# Unicode Tables

Generated by `scripts/unicode_tables.py` from Unicode
{unicodedata.unidata_version}; don't edit by hand.

The zero of each run of ten decimal digits, in order. Every Unicode
decimal digit (general category Nd) is in one of these runs, as its zero
plus its value.

    let digitZeros: List<Int> = [
{rows([f"0x{z:X}" for z in zeros], 8)},
    ];

Simple case folding (Unicode's `CaseFolding.txt`, statuses C and S), as
{len(runs)} runs of four numbers: a start, a count, a stride of 1 or 2, and a
delta. The code points `start`, `start + stride`, and so on, `count` of
them, each fold to themselves plus `delta`. Runs are in order and don't
overlap, and every code point not in one folds to itself. It's built a
few rows at a time: C++ can't compile a list literal of about 900
numbers or more, and Java and C# do better with small initializers.

    let foldRuns: List<Int> = buildFoldRuns();

    let buildFoldRuns(): List<Int> {{
      let runs = new ListBuilder<Int>();
{chunks(fold_values, 4)}
      runs.toList()
    }}

Base letters, for comparing without accents: {len(bases)} pairs of a code
point and the letter under its accents, from canonical decompositions
into a letter and combining marks, in order. Others are their own base.

    let basePairs: List<Int> = buildBasePairs();

    let buildBasePairs(): List<Int> {{
      let runs = new ListBuilder<Int>();
{chunks([f"0x{c:X}, 0x{b:X}" for c, b in bases], 8)}
      runs.toList()
    }}

Full case folding where it gives more than one code point, as `ß` to
`ss`: {len(fulls)} entries of four numbers, a code point and then up to
three, with 0 for none. Others fold as `foldCase` does.

    let fullFolds: List<Int> = buildFullFolds();

    let buildFullFolds(): List<Int> {{
      let runs = new ListBuilder<Int>();
{chunks([", ".join(f"0x{n:X}" for n in [c] + u + [0] * (3 - len(u))) for c, u in fulls], 4)}
      runs.toList()
    }}

Odd cases: the {len(odd)} code points that fold to the same letter as
another of the same case but aren't the usual one, as the Kelvin sign `K`
beside `K`, or `ς` beside `Σ`. They're only told apart at the last
level of comparison. All are from U+00B5 up.

    let oddCases: List<Int> = [
{rows([f"0x{c:X}" for c in odd], 8)},
    ];

Combining marks (general category Mn), as {len(marks)} runs of a start and
a count, in order. A mark after a letter is part of that letter, as its
accent.

    let markRuns: List<Int> = buildMarkRuns();

    let buildMarkRuns(): List<Int> {{
      let runs = new ListBuilder<Int>();
{chunks([f"0x{a:X}, {n}" for a, n in marks], 8)}
      runs.toList()
    }}

Canonical compositions of a code point and one combining mark, as NFC
makes them: {len(composed)} entries of a base, a mark, and the composed
code point, sorted by base and then mark, so `e` and U+0301 make `é`.

    let compositions: List<Int> = buildCompositions();

    let buildCompositions(): List<Int> {{
      let runs = new ListBuilder<Int>();
{chunks([f"0x{b:X}, 0x{m:X}, 0x{c:X}" for b, m, c in composed], 6)}
      runs.toList()
    }}
""")


if __name__ == "__main__":
    main()

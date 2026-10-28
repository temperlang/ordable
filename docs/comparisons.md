# How Ordable Compares

Measured 2026-10-26 against the usual natural sorts: Python's `natsort`
8.4, JS's `Intl.Collator` (English, numeric) plus `natural-orderby` and
`natural-compare`, and Rust's `natord` 1.0.9 and `alphanumeric-sort`
1.5.8. Ordable ran in Python, JS, and Rust, and sorted every set
identically in all three.

## Where Ordable stands out

- **One answer, whatever the input order.** Ordable never calls two
  different strings equal. Several others do: `01` and `1`, `A` and `a`
  (ignoring case), `é` and `e` (by base letter), or `١٠` and `10`. Then
  the result depends on the order the list arrived in, so the same files
  can sort differently on two machines. Over 300 random strings,
  `natsort` tied 54 distinct pairs, `Intl.Collator` 54, `natord` 197, and
  `natural-orderby` 257. Ordable, `natural-compare`, and
  `alphanumeric-sort` tied none, and of those, only Ordable reads digits
  outside ASCII or ignores case.
- **The same order in every language.** Ordable gives identical results
  in C++, C#, Java, JavaScript, Lua, Python, and Rust. The others each
  exist in one language, and `Intl.Collator` varies by locale, ICU
  version, and platform.
- **Digits in every script.** `file٢` (Arabic-Indic 2) sorts before
  `file١٠` and `file10`, and fullwidth `２` before `１０`. `natsort` and
  `Intl.Collator` read other scripts' digits too, but tie `١٠` with `10`;
  `natural-orderby`, `natural-compare`, `natord`, and `alphanumeric-sort`
  compare them as plain characters.
- **Numbers of any length,** as most others manage too.
- **Transitive,** which every library here passed on random triples, as
  Ordable now does after its property tests caught a bug.

Since this comparison, Ordable also sorts accented letters with their
base letter (`e`, then `é`, then `f`), as `Intl.Collator`,
`natural-orderby`, and `natsort` (ignoring case) do, and matches `ß` with
`ss`, as `Intl.Collator` and `natsort` do. Case now only breaks ties by
default, lowercase first, as in `Intl.Collator`; putting case first, as
plain sorting does, is an option. And where ties are wanted, options can
make them: ignoring case, accents, or number forms (`ignoreNumberForms`
makes `01`, `1`, and `١` equal, as `Intl.Collator`'s numeric option
does).

## Where others do things Ordable doesn't (yet)

- **Signed and decimal numbers:** `natsort` with `ns.REAL` and
  `natural-orderby` read `-10` as below `-5` and `1.25` as below `1.3`;
  Ordable reads digits only, like most, so version numbers sort right.
- **Hexadecimal:** `natural-orderby` reads `0x1F` as 31.

These are candidates for options, without changing the defaults.

## Speed

Sorting 20,000 file names, median of several runs (one noisy machine, so
rough), measured 2026-10-27 with the current defaults: accents, full
case folding, and case as a tiebreak. `sortSmart` makes each string's
smart sort key once and then sorts by plain string comparison;
comparing with `compareSmart` directly is shown too.

Since these were measured, keys have gained a two-code-point
header, and combining marks are composed when comparing; the numbers
haven't been measured again, so rerun them before quoting them.

| Language | Ordable `sortSmart` | Ordable comparator | Others |
|---|---|---|---|
| Python | 1.7 s | not measured | `natsort` 0.12 s as a sort key |
| JavaScript | 0.052–0.054 s | 0.08 s | `Intl.Collator` 0.061 s |
| Rust | 0.046 s | 0.07 s | `natord` 0.012 s |

Compact keys made the difference over the day before (timed alternately
against the old layout): keys for these names went from 3.6 to 1.3 times
their string's length, and `sortSmart` from 1.9 to 1.7 s in Python, 62–74
to 52–54 ms in JavaScript, and 67 to 46 ms in Rust, where making 20,000
keys went from 54 to 34 ms. In Python, most of the time is generated code
doing simple integer and string steps through helper calls, which Temper
itself can make faster.

A taste of more speed in Rust (2026-10-26): Temper's Rust output shares
values with `Arc`, so they could cross threads. Converting a copy of
Ordable's generated Rust to `Rc` by hand, timed against the same copy
with `Arc`, alternately: `sortSmart` went from 26 to 14 ms, sorting by
`compareSmart` from 37 to 30 ms, and 20,000 smart keys from 16 to
8–11 ms. Temper may use `Rc` where values stay on one thread, once its
model for threads is settled.

# How Ordable Compares

Measured 2026-10-26 against the usual natural sorts: Python's `natsort`
8.4, JS's `Intl.Collator` (English, numeric) plus `natural-orderby` and
`natural-compare`, and Rust's `natord` 1.0.9 and `alphanumeric-sort`
1.5.8. Ordable ran in Python, JS and Rust, and sorted every set
identically in all three.

## Where Ordable stands out

- **One answer, whatever the input order.** Ordable never calls two
  different strings equal. Several others do: `01` and `1`, `A` and `a`
  (ignoring case), `é` and `e` (by base letter), or `١٠` and `10`. Then
  the result depends on the order the list arrived in, so the same files
  can sort differently on two machines. Over 300 random strings,
  `natsort` tied 54 distinct pairs, `Intl.Collator` 54, `natord` 197 and
  `natural-orderby` 257. Ordable, `natural-compare` and
  `alphanumeric-sort` tied none, and of those, only Ordable reads digits
  outside ASCII or ignores case.
- **The same order in every language.** Ordable gives identical results
  in C++, C#, Java, JavaScript, Lua, Python and Rust. The others each
  exist in one language, and `Intl.Collator` varies by locale, ICU
  version and platform.
- **Digits in every script.** `file٢` (Arabic-Indic 2) sorts before
  `file١٠` and `file10`, and fullwidth `２` before `１０`. `natsort` and
  `Intl.Collator` read other scripts' digits too, but tie `١٠` with `10`;
  `natural-orderby`, `natural-compare`, `natord` and `alphanumeric-sort`
  compare them as plain characters.
- **Numbers of any length,** as most others manage too.
- **Transitive,** which every library here passed on random triples, as
  Ordable now does after its property tests caught a bug.

## Where others do things Ordable doesn't (yet)

- **Accents by base letter:** `Intl.Collator`, `natural-orderby` and
  `natsort` (ignoring case) put `é` with `e`; Ordable puts it after `z`.
- **`ß` as `ss`** when ignoring case: `Intl.Collator` (base) and
  `natsort` do.
- **Signed and decimal numbers:** `natsort` with `ns.REAL` and
  `natural-orderby` read `-10` as below `-5` and `1.25` as below `1.3`;
  Ordable reads digits only, like most, so version numbers sort right.
- **Hexadecimal:** `natural-orderby` reads `0x1F` as 31.

These are candidates for options, without changing the defaults.

## Speed

Sorting 20,000 file names, median of 3 (one noisy machine, so rough):

| Language | Ordable | Others |
|---|---|---|
| Python | 7.3 s | `natsort` 0.14 s as a sort key, 3.5 s as a comparison |
| JavaScript | 0.16–0.36 s | `Intl.Collator` 0.10 s, `natural-compare` 0.25 s, `natural-orderby` 1.5 s |
| Rust | 0.08–0.09 s | `natord` 0.02 s, `alphanumeric-sort` 0.01 s |

Ordable is slowest in Python, where a sort calls back into Python for
every comparison, and a few times slower than the fastest elsewhere. A
sort key, computed once per string and compared natively, would close
that gap; see the roadmap.

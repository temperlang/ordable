# Ordable

Sorts strings in natural order, the way people expect: `file2` before
`file10`, since runs of digits compare as numbers.

## Examples

In Temper, and the same API in each supported language:

```temper
let names = ["img12.png", "img10.png", "img2.png", "img1.png"];
sortNatural(names); // img1.png img2.png img10.png img12.png

compareNatural("file2", "file10"); // Negative: file2 comes first
compareNaturalIgnoringCase("a", "B"); // Negative: a comes first

// Any items, by a string from each, such as files by name.
sortNaturalByKey(files) { file => file.name };
```

Also: a [tour](demos/README.md) of the whole API in each language, with
identical output.

## Rules

- Runs of ASCII digits compare by value, at any length, without overflow.
- Everything else compares by code point, or, when ignoring case, with
  ASCII letters folded to lowercase.
- Two strings compare equal only if they're the same, so sorting gives one
  answer whatever the input order. Leading zeros (`1` before `01`) and,
  when ignoring case, case (`A` before `a`) only break ties.
- No locale rules: that's for ICU or the platform.

Only ASCII digits and letters are special so far. Other decimal digits and
Unicode case folding need tables that Temper doesn't have yet.

## Languages

Made in Temper, Ordable supports these languages, and its tests run on each:

- C++
- C\#
- Java
- JavaScript
- Lua
- Python
- Rust

## Development

Run tests with [Temper](https://temperlang.dev/), on one backend while
working:

    temper test -b py

Or on all of them:

    temper test -b cpp -b csharp -b java -b js -b lua -b py -b rust

Run the tour in every language against `temper.out/`, checking each prints
the same text (see [demos](demos/README.md)):

    uv run demos/run.py

CI runs the tests and the tour on every backend for pull requests and
pushes to `main`, using Temper's nightly `dev` build. Source files in `src/`
are literate Markdown, with tests next to the code they cover.

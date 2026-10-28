"""A tour of Ordable's whole public API, from Python.

The same tour exists for each language Ordable supports, and they all print
the same text. See ../README.md for how to run them.
"""

from dataclasses import dataclass
from functools import cmp_to_key

from ordable import (
    Casing,
    Order,
    compare_smart,
    smart_key,
    sort_smart,
    sort_smart_by_key,
)


def order(n):
    return "before" if n < 0 else "after" if n > 0 else "same"


def section(title):
    print()
    print(f"## {title}")


print("# Ordable tour")

section("1. Comparing")

# Negative means the first comes first, positive the second, and 0 only for
# the same string.
# Case only breaks ties, lowercase first.
pairs = [("file2", "file10"), ("x01", "x1"), ("1.9", "1.10"), ("file٢", "file10"), ("a", "B"), ("a", "A"), ("file10", "file10")]  # snippet: compare
for a, b in pairs:  # snippet: compare
    print(f"{a} vs {b}: {order(compare_smart(a, b))}")  # snippet: compare

section("2. Sorting strings")

files = ["img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png"]  # snippet: sort, options
print(f"files: {' '.join(sort_smart(files))}")  # snippet: sort

# Numbers of any length, and leading zeros only breaking ties.
versions = ["v1.10", "v2.0", "v1.9", "v10.1", "v1.2"]  # snippet: numbers
print(f"versions: {' '.join(sort_smart(versions))}")  # snippet: numbers
big = ["n123456789012345678901234567890", "n9", "n99999999999999999999"]  # snippet: numbers
print(f"big numbers: {' '.join(sort_smart(big))}")  # snippet: numbers
print(f"leading zeros: {' '.join(sort_smart(['2', '001', '1', '01']))}")  # snippet: ties

# Smart keys sort by plain string comparison, as in a database.
print(f"smart keys, file2 before file10: {'yes' if smart_key('file2') < smart_key('file10') else 'no'}")  # snippet: keys
# Keys are the same in every language, so they can be stored and shared.
print(f"key for file10: {' '.join(f'{ord(c):X}' for c in smart_key('file10'))}")  # snippet: keys

section("3. Options")

# An Order has the same functions as methods, with options.
upper_first = Order(upper_first=True)  # snippet: options
print(f"uppercase first: {' '.join(upper_first.sort(files))}")  # snippet: options
case_first = Order(casing=Casing.first)  # snippet: options
print(f"case first: {' '.join(case_first.sort(files))}")  # snippet: options
# Or let different strings be equal, here ignoring accents and case,
# with equal keys too.
loose = Order(casing=Casing.ignored, ignore_accents=True)  # snippet: equal
print(f"ignoring accents and case, Café vs CAFE: {order(loose.compare('Café', 'CAFE'))}")  # snippet: equal
print(f"same key: {'yes' if loose.key('Café') == loose.key('CAFE') else 'no'}")  # snippet: equal
# Or compare numbers by value alone, whatever their leading zeros or
# digit script.
by_value = Order(ignore_number_forms=True)  # snippet: equal
print(f"ignoring number forms, file01 vs file1: {order(by_value.compare('file01', 'file1'))}")  # snippet: equal

section("4. Sorting your own types")


@dataclass
class Track:
    title: str
    seconds: int


# sort_smart_by_key sorts any items by a string from each, made once each.
tracks = [Track("Track 10: Outro", 95), Track("Track 1: Intro", 61), Track("Track 2: Rise", 184)]  # snippet: by-key
by_title = sort_smart_by_key(tracks, lambda track: track.title)  # snippet: by-key
print("tracks by title:")
for track in by_title:
    print(f"  {track.title} ({track.seconds} s)")

# Or sort with the language's own tools, using compare_smart to compare.
# Python sorts by key, so cmp_to_key adapts the comparison.
own = sorted(tracks, key=cmp_to_key(lambda a, b: compare_smart(a.title, b.title)))
print(f"with the language's own sort: {', '.join(track.title for track in own)}")
by_method = Order(upper_first=True).sort_by_key(tracks, lambda track: track.title)  # snippet: by-key
print(f"with an Order's method: {', '.join(track.title for track in by_method)}")

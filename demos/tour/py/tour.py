"""A tour of Ordable's whole public API, from Python.

The same tour exists for each language Ordable supports, and they all print
the same text. See ../README.md for how to run them.
"""

from dataclasses import dataclass
from functools import cmp_to_key

from ordable import (
    compare_natural,
    compare_natural_ignoring_case,
    natural_key,
    sort_natural,
    sort_natural_by_key,
    sort_natural_ignoring_case,
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
for a, b in [("file2", "file10"), ("x01", "x1"), ("1.9", "1.10"), ("file٢", "file10"), ("a", "B"), ("file10", "file10")]:  # snippet: compare
    print(f"{a} vs {b}: {order(compare_natural(a, b))}")  # snippet: compare

# Ignoring case, letters compare as lowercase, and case only breaks ties.
for a, b in [("a", "B"), ("A", "a")]:
    print(f"{a} vs {b}, ignoring case: {order(compare_natural_ignoring_case(a, b))}")

section("2. Sorting strings")

files = ["img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png"]  # snippet: sort, ignore-case
print(f"files: {' '.join(sort_natural(files))}")  # snippet: sort
print(f"ignoring case: {' '.join(sort_natural_ignoring_case(files))}")  # snippet: ignore-case

# Numbers of any length, and leading zeros only breaking ties.
versions = ["v1.10", "v2.0", "v1.9", "v10.1", "v1.2"]  # snippet: numbers
print(f"versions: {' '.join(sort_natural(versions))}")  # snippet: numbers
big = ["n123456789012345678901234567890", "n9", "n99999999999999999999"]  # snippet: numbers
print(f"big numbers: {' '.join(sort_natural(big))}")  # snippet: numbers
print(f"leading zeros: {' '.join(sort_natural(['2', '001', '1', '01']))}")  # snippet: ties

# Natural keys sort by plain string comparison, as in a database.
print(f"natural keys, file2 before file10: {'yes' if natural_key('file2') < natural_key('file10') else 'no'}")  # snippet: keys
# Keys are the same in every language, so they can be stored and shared.
print(f"key for file10: {' '.join(f'{ord(c):X}' for c in natural_key('file10'))}")  # snippet: keys

section("3. Sorting your own types")


@dataclass
class Track:
    title: str
    seconds: int


# sort_natural_by_key sorts any items by a string from each, made once each.
tracks = [Track("Track 10: Outro", 95), Track("Track 1: Intro", 61), Track("Track 2: Rise", 184)]  # snippet: by-key
by_title = sort_natural_by_key(tracks, lambda track: track.title)  # snippet: by-key
print("tracks by title:")
for track in by_title:
    print(f"  {track.title} ({track.seconds} s)")

# Or sort with the language's own tools, using compare_natural to compare.
# Python sorts by key, so cmp_to_key adapts the comparison.
own = sorted(tracks, key=cmp_to_key(lambda a, b: compare_natural(a.title, b.title)))
print(f"with the language's own sort: {', '.join(track.title for track in own)}")

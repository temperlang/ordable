// A tour of Ordable's whole public API, from JavaScript.
//
// The same tour exists for each language Ordable supports, and they all print
// the same text. See ../README.md for how to run them.

import {
  compareNatural,
  compareNaturalIgnoringCase,
  sortNatural,
  sortNaturalIgnoringCase,
} from "ordable";

const order = (n) => (n < 0 ? "before" : n > 0 ? "after" : "same");

function section(title) {
  console.log();
  console.log(`## ${title}`);
}

console.log("# Ordable tour");

section("1. Comparing");

// Negative means the first comes first, positive the second, and 0 only for
// the same string.
for (const [a, b] of [["file2", "file10"], ["x01", "x1"], ["1.9", "1.10"], ["a", "B"], ["file10", "file10"]]) {
  console.log(`${a} vs ${b}: ${order(compareNatural(a, b))}`);
}

// Ignoring case, letters compare as lowercase, and case only breaks ties.
for (const [a, b] of [["a", "B"], ["A", "a"]]) {
  console.log(`${a} vs ${b}, ignoring case: ${order(compareNaturalIgnoringCase(a, b))}`);
}

section("2. Sorting strings");

const files = ["img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png"];
console.log(`files: ${sortNatural(files).join(" ")}`);
console.log(`ignoring case: ${sortNaturalIgnoringCase(files).join(" ")}`);

// Numbers of any length, and leading zeros only breaking ties.
const versions = ["v1.10", "v2.0", "v1.9", "v10.1", "v1.2"];
console.log(`versions: ${sortNatural(versions).join(" ")}`);
const big = ["n123456789012345678901234567890", "n9", "n99999999999999999999"];
console.log(`big numbers: ${sortNatural(big).join(" ")}`);
console.log(`leading zeros: ${sortNatural(["2", "001", "1", "01"]).join(" ")}`);

section("3. Sorting your own types");

// Sort with the language's own tools, using compareNatural to compare.
const tracks = [
  { title: "Track 10: Outro", seconds: 95 },
  { title: "Track 1: Intro", seconds: 61 },
  { title: "Track 2: Rise", seconds: 184 },
];
const byTitle = tracks.toSorted((a, b) => compareNatural(a.title, b.title));
console.log("tracks by title:");
for (const track of byTitle) {
  console.log(`  ${track.title} (${track.seconds} s)`);
}

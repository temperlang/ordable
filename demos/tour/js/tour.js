// A tour of Ordable's whole public API, from JavaScript.
//
// The same tour exists for each language Ordable supports, and they all print
// the same text. See ../README.md for how to run them.

import {
  compareNatural,
  compareNaturalIgnoringCase,
  naturalKey,
  sortNatural,
  sortNaturalByKey,
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
for (const [a, b] of [["file2", "file10"], ["x01", "x1"], ["1.9", "1.10"], ["file٢", "file10"], ["a", "B"], ["file10", "file10"]]) {  // snippet: compare
  console.log(`${a} vs ${b}: ${order(compareNatural(a, b))}`);  // snippet: compare
}  // snippet: compare

// Ignoring case, letters compare as lowercase, and case only breaks ties.
for (const [a, b] of [["a", "B"], ["A", "a"]]) {
  console.log(`${a} vs ${b}, ignoring case: ${order(compareNaturalIgnoringCase(a, b))}`);
}

section("2. Sorting strings");

const files = ["img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png"];  // snippet: sort, ignore-case
console.log(`files: ${sortNatural(files).join(" ")}`);  // snippet: sort
console.log(`ignoring case: ${sortNaturalIgnoringCase(files).join(" ")}`);  // snippet: ignore-case

// Numbers of any length, and leading zeros only breaking ties.
const versions = ["v1.10", "v2.0", "v1.9", "v10.1", "v1.2"];  // snippet: numbers
console.log(`versions: ${sortNatural(versions).join(" ")}`);  // snippet: numbers
const big = ["n123456789012345678901234567890", "n9", "n99999999999999999999"];  // snippet: numbers
console.log(`big numbers: ${sortNatural(big).join(" ")}`);  // snippet: numbers
console.log(`leading zeros: ${sortNatural(["2", "001", "1", "01"]).join(" ")}`);  // snippet: ties

// Natural keys sort by plain string comparison, as in a database.
console.log(`natural keys, file2 before file10: ${naturalKey("file2") < naturalKey("file10") ? "yes" : "no"}`);  // snippet: keys
// Keys are the same in every language, so they can be stored and shared.
const hex = [...naturalKey("file10")].map((c) => c.codePointAt(0).toString(16).toUpperCase());  // snippet: keys
console.log(`key for file10: ${hex.join(" ")}`);  // snippet: keys

section("3. Sorting your own types");

// sortNaturalByKey sorts any items by a string from each, made once each.
const tracks = [  // snippet: by-key
  { title: "Track 10: Outro", seconds: 95 },  // snippet: by-key
  { title: "Track 1: Intro", seconds: 61 },  // snippet: by-key
  { title: "Track 2: Rise", seconds: 184 },  // snippet: by-key
];  // snippet: by-key
const byTitle = sortNaturalByKey(tracks, (track) => track.title);  // snippet: by-key
console.log("tracks by title:");
for (const track of byTitle) {
  console.log(`  ${track.title} (${track.seconds} s)`);
}

// Or sort with the language's own tools, using compareNatural to compare.
const own = tracks.toSorted((a, b) => compareNatural(a.title, b.title));
console.log(`with the language's own sort: ${own.map((track) => track.title).join(", ")}`);

// A tour of Ordable's whole public API, from C#.
//
// The same tour exists for each language Ordable supports, and they all print
// the same text. See ../README.md for how to run them.

using System;
using System.Collections.Generic;
using System.Linq;
using static Ordable.OrdableGlobal;

static string Order(int n) => n < 0 ? "before" : n > 0 ? "after" : "same";

static void Section(string title)
{
    Console.WriteLine();
    Console.WriteLine($"## {title}");
}

Console.WriteLine("# Ordable tour");

Section("1. Comparing");

// Negative means the first comes first, positive the second, and 0 only for
// the same string.
foreach (var (a, b) in new[] { ("file2", "file10"), ("x01", "x1"), ("1.9", "1.10"), ("file٢", "file10"), ("a", "B"), ("file10", "file10") })  // snippet: compare
{  // snippet: compare
    Console.WriteLine($"{a} vs {b}: {Order(CompareNatural(a, b))}");  // snippet: compare
}  // snippet: compare

// Ignoring case, letters compare as lowercase, and case only breaks ties.
foreach (var (a, b) in new[] { ("a", "B"), ("A", "a") })
{
    Console.WriteLine($"{a} vs {b}, ignoring case: {Order(CompareNaturalIgnoringCase(a, b))}");
}

Section("2. Sorting strings");

var files = new[] { "img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png" };  // snippet: sort, ignore-case
Console.WriteLine($"files: {string.Join(" ", SortNatural(files))}");  // snippet: sort
Console.WriteLine($"ignoring case: {string.Join(" ", SortNaturalIgnoringCase(files))}");  // snippet: ignore-case

// Numbers of any length, and leading zeros only breaking ties.
var versions = new[] { "v1.10", "v2.0", "v1.9", "v10.1", "v1.2" };  // snippet: numbers
Console.WriteLine($"versions: {string.Join(" ", SortNatural(versions))}");  // snippet: numbers
var big = new[] { "n123456789012345678901234567890", "n9", "n99999999999999999999" };  // snippet: numbers
Console.WriteLine($"big numbers: {string.Join(" ", SortNatural(big))}");  // snippet: numbers
Console.WriteLine($"leading zeros: {string.Join(" ", SortNatural(new[] { "2", "001", "1", "01" }))}");  // snippet: ties

// Natural keys sort by plain string comparison, as in a database.
var before = string.CompareOrdinal(NaturalKey("file2"), NaturalKey("file10")) < 0;  // snippet: keys
Console.WriteLine($"natural keys, file2 before file10: {(before ? "yes" : "no")}");  // snippet: keys
// Keys are the same in every language, so they can be stored and shared.
Console.WriteLine($"key for file10: {string.Join(" ", NaturalKey("file10").Select(c => ((int)c).ToString("X")))}");  // snippet: keys

Section("3. Sorting your own types");

// SortNaturalByKey sorts any items by a string from each, made once each.
var tracks = new[] { new Track("Track 10: Outro", 95), new Track("Track 1: Intro", 61), new Track("Track 2: Rise", 184) };  // snippet: by-key
var byTitle = SortNaturalByKey(tracks, track => track.Title);  // snippet: by-key
Console.WriteLine("tracks by title:");
foreach (var track in byTitle)
{
    Console.WriteLine($"  {track.Title} ({track.Seconds} s)");
}

// Or sort with the language's own tools, using CompareNatural to compare.
var own = tracks.OrderBy(track => track.Title, Comparer<string>.Create(CompareNatural));
Console.WriteLine($"with the language's own sort: {string.Join(", ", own.Select(track => track.Title))}");

record Track(string Title, int Seconds);

// A tour of Ordable's whole public API, from C#.
//
// The same tour exists for each language Ordable supports, and they all print
// the same text. See ../README.md for how to run them.

using System;
using System.Collections.Generic;
using System.Linq;
using Ordable;
using static Ordable.OrdableGlobal;

static string Relation(int n) => n < 0 ? "before" : n > 0 ? "after" : "same";

static void Section(string title)
{
    Console.WriteLine();
    Console.WriteLine($"## {title}");
}

Console.WriteLine("# Ordable tour");

Section("1. Comparing");

// Negative means the first comes first, positive the second, and 0 only for
// the same string. Case only breaks ties, lowercase first.
var pairs = new[] {  // snippet: compare
    ("file2", "file10"), ("x01", "x1"), ("1.9", "1.10"), ("file٢", "file10"),  // snippet: compare
    ("a", "B"), ("a", "A"), ("file10", "file10"),  // snippet: compare
};  // snippet: compare
foreach (var (a, b) in pairs)  // snippet: compare
{  // snippet: compare
    Console.WriteLine($"{a} vs {b}: {Relation(CompareSmart(a, b))}");  // snippet: compare
}  // snippet: compare

Section("2. Sorting strings");

var files = new[] { "img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png" };  // snippet: sort, options
Console.WriteLine($"files: {string.Join(" ", SortSmart(files))}");  // snippet: sort

// Numbers of any length, and leading zeros only breaking ties.
var versions = new[] { "v1.10", "v2.0", "v1.9", "v10.1", "v1.2" };  // snippet: numbers
Console.WriteLine($"versions: {string.Join(" ", SortSmart(versions))}");  // snippet: numbers
var big = new[] { "n123456789012345678901234567890", "n9", "n99999999999999999999" };  // snippet: numbers
Console.WriteLine($"big numbers: {string.Join(" ", SortSmart(big))}");  // snippet: numbers
Console.WriteLine($"leading zeros: {string.Join(" ", SortSmart(new[] { "2", "001", "1", "01" }))}");  // snippet: ties

// Smart keys sort by plain string comparison, as in a database.
var before = string.CompareOrdinal(SmartKey("file2"), SmartKey("file10")) < 0;  // snippet: keys
Console.WriteLine($"smart keys, file2 before file10: {(before ? "yes" : "no")}");  // snippet: keys
// Keys are the same in every language, so they can be stored and shared.
Console.WriteLine($"key for file10: {string.Join(" ", SmartKey("file10").Select(c => ((int)c).ToString("X")))}");  // snippet: keys

Section("3. Options");

// An Order has the same functions as methods, with options as named
// arguments: here uppercase first, then case first.
var upperFirst = new Order(upperFirst: true);  // snippet: options
Console.WriteLine($"uppercase first: {string.Join(" ", upperFirst.Sort(files))}");  // snippet: options
var caseFirst = new Order(casing: Casing.First);  // snippet: options
Console.WriteLine($"case first: {string.Join(" ", caseFirst.Sort(files))}");  // snippet: options
// Or let different strings be equal, here ignoring accents and case,
// with equal keys too.
var loose = new Order(casing: Casing.Ignored, ignoreAccents: true);  // snippet: equal
Console.WriteLine($"ignoring accents and case, Café vs CAFE: {Relation(loose.Compare("Café", "CAFE"))}");  // snippet: equal
Console.WriteLine($"same key: {(loose.Key("Café") == loose.Key("CAFE") ? "yes" : "no")}");  // snippet: equal
// Or compare numbers by value alone, whatever their leading zeros or
// digit script.
var byValue = new Order(ignoreNumberForms: true);  // snippet: equal
Console.WriteLine($"ignoring number forms, file01 vs file1: {Relation(byValue.Compare("file01", "file1"))}");  // snippet: equal

Section("4. Sorting your own types");

// SortSmartByKey sorts any items by a string from each, made once each.
var tracks = new[] { new Track("Track 10: Outro", 95), new Track("Track 1: Intro", 61), new Track("Track 2: Rise", 184) };  // snippet: by-key
var byTitle = SortSmartByKey(tracks, track => track.Title);  // snippet: by-key
Console.WriteLine("tracks by title:");
foreach (var track in byTitle)
{
    Console.WriteLine($"  {track.Title} ({track.Seconds} s)");
}

// Or sort with the language's own tools, using CompareSmart to compare.
var own = tracks.OrderBy(track => track.Title, Comparer<string>.Create(CompareSmart));
Console.WriteLine($"with the language's own sort: {string.Join(", ", own.Select(track => track.Title))}");

record Track(string Title, int Seconds);

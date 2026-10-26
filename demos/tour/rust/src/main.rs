//! A tour of Ordable's whole public API, from Rust.
//!
//! The same tour exists for each language Ordable supports, and they all
//! print the same text. See ../README.md for how to run them.

use ordable::{
    compare_natural, compare_natural_ignoring_case, natural_key, sort_natural, sort_natural_by_key,
    sort_natural_ignoring_case,
};
use std::sync::Arc;

/// Ordable takes lists of shared strings.
fn list(items: &[&str]) -> Vec<Arc<String>> {
    items.iter().map(|s| Arc::new(s.to_string())).collect()
}

fn join(strings: &[Arc<String>]) -> String {
    strings.iter().map(|s| s.as_str()).collect::<Vec<_>>().join(" ")
}

fn order(n: i32) -> &'static str {
    if n < 0 { "before" } else if n > 0 { "after" } else { "same" }
}

fn section(title: &str) {
    println!();
    println!("## {title}");
}

#[derive(Clone)]
struct Track {
    title: String,
    seconds: i32,
}

fn main() {
    // Sets up Ordable's tables. Call it once before anything else.
    ordable::init(None).expect("ordable::init");

    println!("# Ordable tour");

    section("1. Comparing");

    // Negative means the first comes first, positive the second, and 0 only
    // for the same string.
    for (a, b) in [("file2", "file10"), ("x01", "x1"), ("1.9", "1.10"), ("file٢", "file10"), ("a", "B"), ("file10", "file10")] {  // snippet: compare
        println!("{a} vs {b}: {}", order(compare_natural(a, b)));  // snippet: compare
    }  // snippet: compare

    // Ignoring case, letters compare as lowercase, and case only breaks ties.
    for (a, b) in [("a", "B"), ("A", "a")] {
        println!("{a} vs {b}, ignoring case: {}", order(compare_natural_ignoring_case(a, b)));
    }

    section("2. Sorting strings");

    let files = list(&["img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png"]);  // snippet: sort, ignore-case
    println!("files: {}", join(&sort_natural(files.clone())));  // snippet: sort
    println!("ignoring case: {}", join(&sort_natural_ignoring_case(files)));  // snippet: ignore-case

    // Numbers of any length, and leading zeros only breaking ties.
    let versions = list(&["v1.10", "v2.0", "v1.9", "v10.1", "v1.2"]);  // snippet: numbers
    println!("versions: {}", join(&sort_natural(versions)));  // snippet: numbers
    let big = list(&["n123456789012345678901234567890", "n9", "n99999999999999999999"]);  // snippet: numbers
    println!("big numbers: {}", join(&sort_natural(big)));  // snippet: numbers
    println!("leading zeros: {}", join(&sort_natural(list(&["2", "001", "1", "01"]))));  // snippet: ties

    // Natural keys sort by plain string comparison, as in a database.
    let before = natural_key("file2") < natural_key("file10");  // snippet: keys
    println!("natural keys, file2 before file10: {}", if before { "yes" } else { "no" });  // snippet: keys
    // Keys are the same in every language, so they can be stored and shared.
    let hex: Vec<String> = natural_key("file10").chars().map(|c| format!("{:X}", c as u32)).collect();  // snippet: keys
    println!("key for file10: {}", hex.join(" "));  // snippet: keys

    section("3. Sorting your own types");

    // sort_natural_by_key sorts any items by a string from each, made once
    // each.
    let tracks = vec![  // snippet: by-key
        Track { title: "Track 10: Outro".into(), seconds: 95 },  // snippet: by-key
        Track { title: "Track 1: Intro".into(), seconds: 61 },  // snippet: by-key
        Track { title: "Track 2: Rise".into(), seconds: 184 },  // snippet: by-key
    ];  // snippet: by-key
    let by_title = sort_natural_by_key(tracks.clone(), Arc::new(|track: Track| Arc::new(track.title)));  // snippet: by-key
    println!("tracks by title:");
    for track in by_title.iter() {
        println!("  {} ({} s)", track.title, track.seconds);
    }

    // Or sort with the language's own tools, using compare_natural to
    // compare. It returns an i32, so compare that with 0 for an Ordering.
    let mut own = tracks;
    own.sort_by(|a, b| compare_natural(a.title.as_str(), b.title.as_str()).cmp(&0));
    let titles: Vec<&str> = own.iter().map(|track| track.title.as_str()).collect();
    println!("with the language's own sort: {}", titles.join(", "));
}

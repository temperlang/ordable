// A tour of Ordable's whole public API, from C++.
//
// The same tour exists for each language Ordable supports, and they all print
// the same text. See ../README.md for how to run them.

#include <algorithm>
#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "ordable/init.hpp"

using ordable::Casing;
using ordable::Order;
using ordable::compareSmart;
using ordable::smartKey;
using ordable::sortSmart;
using ordable::sortSmartByKey;

// Ordable takes lists as shared vectors.
std::shared_ptr<std::vector<std::string>> list(std::initializer_list<std::string> values) {
  return std::make_shared<std::vector<std::string>>(values);
}

std::string join(std::vector<std::string> const &strings, std::string const &sep = " ") {
  std::string out;
  for (size_t i = 0; i < strings.size(); i++) {
    out += (i ? sep : "") + strings[i];
  }
  return out;
}

std::string order(int n) { return n < 0 ? "before" : n > 0 ? "after" : "same"; }

void section(std::string const &title) { std::cout << "\n## " << title << "\n"; }

struct Track {
  std::string title;
  int seconds;
};

int main() {
  // Sets up Ordable's tables. Call it once before anything else.
  ordable::global_init_init();

  std::cout << "# Ordable tour\n";

  section("1. Comparing");

  // Negative means the first comes first, positive the second, and 0 only for
  // the same string. Case only breaks ties, lowercase first.
  std::vector<std::pair<std::string, std::string>> pairs = {  // snippet: compare
      {"file2", "file10"}, {"x01", "x1"}, {"1.9", "1.10"}, {"file٢", "file10"},  // snippet: compare
      {"a", "B"}, {"a", "A"}, {"file10", "file10"}};  // snippet: compare
  for (auto const &p : pairs) {  // snippet: compare
    std::cout << p.first << " vs " << p.second << ": " << order(compareSmart(p.first, p.second)) << "\n";  // snippet: compare
  }  // snippet: compare

  section("2. Sorting strings");

  auto files = list({"img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png"});  // snippet: sort, options
  std::cout << "files: " << join(*sortSmart(files)) << "\n";  // snippet: sort

  // Numbers of any length, and leading zeros only breaking ties.
  auto versions = list({"v1.10", "v2.0", "v1.9", "v10.1", "v1.2"});  // snippet: numbers
  std::cout << "versions: " << join(*sortSmart(versions)) << "\n";  // snippet: numbers
  auto big = list({"n123456789012345678901234567890", "n9", "n99999999999999999999"});  // snippet: numbers
  std::cout << "big numbers: " << join(*sortSmart(big)) << "\n";  // snippet: numbers
  std::cout << "leading zeros: " << join(*sortSmart(list({"2", "001", "1", "01"}))) << "\n";  // snippet: ties

  // Smart keys sort by plain string comparison, as in a database.
  bool before = smartKey("file2") < smartKey("file10");  // snippet: keys
  std::cout << "smart keys, file2 before file10: " << (before ? "yes" : "no") << "\n";  // snippet: keys
  // Keys are the same in every language, so they can be stored and shared.
  // (This key is all ASCII, so its bytes are its code points.)
  std::cout << "key for file10:";  // snippet: keys
  for (unsigned char c : smartKey("file10")) {  // snippet: keys
    std::cout << " " << std::uppercase << std::hex << static_cast<int>(c) << std::dec;  // snippet: keys
  }  // snippet: keys
  std::cout << "\n";  // snippet: keys

  section("3. Options");

  // An Order has the same functions as methods, with options: here
  // uppercase first, then case first.
  auto upperFirst = Order::make(Casing::last, true);  // snippet: options
  std::cout << "uppercase first: " << join(*upperFirst->sort(files)) << "\n";  // snippet: options
  auto caseFirst = Order::make(Casing::first);  // snippet: options
  std::cout << "case first: " << join(*caseFirst->sort(files)) << "\n";  // snippet: options
  // Or let different strings be equal, here ignoring accents and case,
  // with equal keys too.
  auto loose = Order::make(Casing::ignored, false, true);  // snippet: equal
  std::cout << "ignoring accents and case, Café vs CAFE: " << order(loose->compare("Café", "CAFE")) << "\n";  // snippet: equal
  std::cout << "same key: " << (loose->key("Café") == loose->key("CAFE") ? "yes" : "no") << "\n";  // snippet: equal
  // Or compare numbers by value alone, whatever their leading zeros or
  // digit script.
  auto byValue = Order::make(Casing::last, false, false, true);  // snippet: equal
  std::cout << "ignoring number forms, file01 vs file1: " << order(byValue->compare("file01", "file1")) << "\n";  // snippet: equal

  section("4. Sorting your own types");

  // sortSmartByKey sorts any items by a string from each, made once each.
  auto tracks = std::make_shared<std::vector<Track>>(  // snippet: by-key
      std::vector<Track>{{"Track 10: Outro", 95}, {"Track 1: Intro", 61}, {"Track 2: Rise", 184}});  // snippet: by-key
  auto byTitle = sortSmartByKey<Track>(tracks, [](Track const &track) { return track.title; });  // snippet: by-key
  std::cout << "tracks by title:\n";
  for (auto const &track : *byTitle) {
    std::cout << "  " << track.title << " (" << track.seconds << " s)\n";
  }

  // Or sort with the language's own tools, using compareSmart to compare.
  std::vector<Track> own = *tracks;
  std::stable_sort(own.begin(), own.end(),
                   [](Track const &a, Track const &b) { return compareSmart(a.title, b.title) < 0; });
  std::vector<std::string> titles;
  for (auto const &track : own) {
    titles.push_back(track.title);
  }
  std::cout << "with the language's own sort: " << join(titles, ", ") << "\n";
  return 0;
}

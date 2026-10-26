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

using ordable::compareNatural;
using ordable::compareNaturalIgnoringCase;
using ordable::sortNatural;
using ordable::sortNaturalByKey;
using ordable::sortNaturalIgnoringCase;

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
  std::cout << "# Ordable tour\n";

  section("1. Comparing");

  // Negative means the first comes first, positive the second, and 0 only for
  // the same string.
  std::vector<std::pair<std::string, std::string>> pairs = {
      {"file2", "file10"}, {"x01", "x1"}, {"1.9", "1.10"}, {"a", "B"}, {"file10", "file10"}};
  for (auto const &p : pairs) {
    std::cout << p.first << " vs " << p.second << ": " << order(compareNatural(p.first, p.second)) << "\n";
  }

  // Ignoring case, letters compare as lowercase, and case only breaks ties.
  std::vector<std::pair<std::string, std::string>> cased = {{"a", "B"}, {"A", "a"}};
  for (auto const &p : cased) {
    std::cout << p.first << " vs " << p.second << ", ignoring case: "
              << order(compareNaturalIgnoringCase(p.first, p.second)) << "\n";
  }

  section("2. Sorting strings");

  auto files = list({"img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png"});
  std::cout << "files: " << join(*sortNatural(files)) << "\n";
  std::cout << "ignoring case: " << join(*sortNaturalIgnoringCase(files)) << "\n";

  // Numbers of any length, and leading zeros only breaking ties.
  auto versions = list({"v1.10", "v2.0", "v1.9", "v10.1", "v1.2"});
  std::cout << "versions: " << join(*sortNatural(versions)) << "\n";
  auto big = list({"n123456789012345678901234567890", "n9", "n99999999999999999999"});
  std::cout << "big numbers: " << join(*sortNatural(big)) << "\n";
  std::cout << "leading zeros: " << join(*sortNatural(list({"2", "001", "1", "01"}))) << "\n";

  section("3. Sorting your own types");

  // sortNaturalByKey sorts any items by a string from each, made once each.
  auto tracks = std::make_shared<std::vector<Track>>(
      std::vector<Track>{{"Track 10: Outro", 95}, {"Track 1: Intro", 61}, {"Track 2: Rise", 184}});
  auto byTitle = sortNaturalByKey<Track>(tracks, [](Track const &track) { return track.title; });
  std::cout << "tracks by title:\n";
  for (auto const &track : *byTitle) {
    std::cout << "  " << track.title << " (" << track.seconds << " s)\n";
  }

  // Or sort with the language's own tools, using compareNatural to compare.
  std::vector<Track> own = *tracks;
  std::stable_sort(own.begin(), own.end(),
                   [](Track const &a, Track const &b) { return compareNatural(a.title, b.title) < 0; });
  std::vector<std::string> titles;
  for (auto const &track : own) {
    titles.push_back(track.title);
  }
  std::cout << "with the language's own sort: " << join(titles, ", ") << "\n";
  return 0;
}

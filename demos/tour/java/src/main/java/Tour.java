// A tour of Ordable's whole public API, from Java.
//
// The same tour exists for each language Ordable supports, and they all print
// the same text. See ../README.md for how to run them.

import static ordable.OrdableGlobal.compareNatural;
import static ordable.OrdableGlobal.compareNaturalIgnoringCase;
import static ordable.OrdableGlobal.naturalKey;
import static ordable.OrdableGlobal.sortNatural;
import static ordable.OrdableGlobal.sortNaturalByKey;
import static ordable.OrdableGlobal.sortNaturalIgnoringCase;

import java.util.Comparator;
import java.util.List;
import ordable.OrdableGlobal;

public class Tour {
    static String order(int n) {
        return n < 0 ? "before" : n > 0 ? "after" : "same";
    }

    static void section(String title) {
        System.out.println();
        System.out.println("## " + title);
    }

    record Track(String title, int seconds) {}

    public static void main(String[] args) {
        System.out.println("# Ordable tour");

        section("1. Comparing");

        // Negative means the first comes first, positive the second, and 0 only
        // for the same string.
        String[][] pairs = {{"file2", "file10"}, {"x01", "x1"}, {"1.9", "1.10"}, {"file٢", "file10"}, {"a", "B"}, {"file10", "file10"}};
        for (String[] p : pairs) {
            System.out.println(p[0] + " vs " + p[1] + ": " + order(compareNatural(p[0], p[1])));
        }

        // Ignoring case, letters compare as lowercase, and case only breaks ties.
        String[][] cased = {{"a", "B"}, {"A", "a"}};
        for (String[] p : cased) {
            System.out.println(p[0] + " vs " + p[1] + ", ignoring case: " + order(compareNaturalIgnoringCase(p[0], p[1])));
        }

        section("2. Sorting strings");

        List<String> files = List.of("img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png");
        System.out.println("files: " + String.join(" ", sortNatural(files)));
        System.out.println("ignoring case: " + String.join(" ", sortNaturalIgnoringCase(files)));

        // Numbers of any length, and leading zeros only breaking ties.
        List<String> versions = List.of("v1.10", "v2.0", "v1.9", "v10.1", "v1.2");
        System.out.println("versions: " + String.join(" ", sortNatural(versions)));
        List<String> big = List.of("n123456789012345678901234567890", "n9", "n99999999999999999999");
        System.out.println("big numbers: " + String.join(" ", sortNatural(big)));
        System.out.println("leading zeros: " + String.join(" ", sortNatural(List.of("2", "001", "1", "01"))));

        // Natural keys sort by plain string comparison, as in a database.
        boolean before = naturalKey("file2").compareTo(naturalKey("file10")) < 0;
        System.out.println("natural keys, file2 before file10: " + (before ? "yes" : "no"));
        // Keys are the same in every language, so they can be stored and shared.
        String hex = naturalKey("file10").codePoints()
            .mapToObj(c -> Integer.toHexString(c).toUpperCase())
            .collect(java.util.stream.Collectors.joining(" "));
        System.out.println("key for file10: " + hex);

        section("3. Sorting your own types");

        // sortNaturalByKey sorts any items by a string from each, made once each.
        List<Track> tracks = List.of(new Track("Track 10: Outro", 95), new Track("Track 1: Intro", 61), new Track("Track 2: Rise", 184));
        List<Track> byTitle = sortNaturalByKey(tracks, Track::title);
        System.out.println("tracks by title:");
        for (Track track : byTitle) {
            System.out.println("  " + track.title() + " (" + track.seconds() + " s)");
        }

        // Or sort with the language's own tools, using compareNatural to compare.
        List<String> own = tracks.stream()
            .sorted(Comparator.comparing(Track::title, OrdableGlobal::compareNatural))
            .map(Track::title)
            .toList();
        System.out.println("with the language's own sort: " + String.join(", ", own));
    }
}

// A tour of Ordable's whole public API, from Java.
//
// The same tour exists for each language Ordable supports, and they all print
// the same text. See ../README.md for how to run them.

import static ordable.OrdableGlobal.compareSmart;
import static ordable.OrdableGlobal.smartKey;
import static ordable.OrdableGlobal.sortSmart;
import static ordable.OrdableGlobal.sortSmartByKey;

import java.util.Comparator;
import java.util.List;
import ordable.OrdableGlobal;
import ordable.Casing;
import ordable.Order;

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
        // for the same string. Case only breaks ties, lowercase first.
        // Smart order, often called natural sorting, but not
        // Comparator.naturalOrder(), which for strings is plain code-unit
        // order, with file10 before file2.
        String[][] pairs = {  // snippet: compare
            {"file2", "file10"}, {"x01", "x1"}, {"1.9", "1.10"}, {"file٢", "file10"},  // snippet: compare
            {"a", "B"}, {"a", "A"}, {"file10", "file10"},  // snippet: compare
        };  // snippet: compare
        for (String[] p : pairs) {  // snippet: compare
            System.out.println(p[0] + " vs " + p[1] + ": " + order(compareSmart(p[0], p[1])));  // snippet: compare
        }  // snippet: compare

        section("2. Sorting strings");

        List<String> files = List.of("img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png");  // snippet: sort, options
        System.out.println("files: " + String.join(" ", sortSmart(files)));  // snippet: sort

        // Numbers of any length, and leading zeros only breaking ties.
        List<String> versions = List.of("v1.10", "v2.0", "v1.9", "v10.1", "v1.2");  // snippet: numbers
        System.out.println("versions: " + String.join(" ", sortSmart(versions)));  // snippet: numbers
        List<String> big = List.of("n123456789012345678901234567890", "n9", "n99999999999999999999");  // snippet: numbers
        System.out.println("big numbers: " + String.join(" ", sortSmart(big)));  // snippet: numbers
        System.out.println("leading zeros: " + String.join(" ", sortSmart(List.of("2", "001", "1", "01"))));  // snippet: ties

        // Smart keys sort by plain string comparison, as in a database.
        boolean before = smartKey("file2").compareTo(smartKey("file10")) < 0;  // snippet: keys
        System.out.println("smart keys, file2 before file10: " + (before ? "yes" : "no"));  // snippet: keys
        // Keys are the same in every language, so they can be stored and shared.
        String hex = smartKey("file10").codePoints()  // snippet: keys
            .mapToObj(c -> Integer.toHexString(c).toUpperCase())  // snippet: keys
            .collect(java.util.stream.Collectors.joining(" "));  // snippet: keys
        System.out.println("key for file10: " + hex);  // snippet: keys

        section("3. Options");

        // An Order has the same functions as methods, with options, set
        // through its builder: here uppercase first, then case first.
        Order upperFirst = new Order.Builder().upperFirst(true).build();  // snippet: options
        System.out.println("uppercase first: " + String.join(" ", upperFirst.sort(files)));  // snippet: options
        Order caseFirst = new Order.Builder().casing(Casing.first).build();  // snippet: options
        System.out.println("case first: " + String.join(" ", caseFirst.sort(files)));  // snippet: options
        // Or let different strings be equal, here ignoring accents and
        // case, with equal keys too.
        Order loose = new Order.Builder().casing(Casing.ignored).ignoreAccents(true).build();  // snippet: equal
        System.out.println("ignoring accents and case, Café vs CAFE: " + order(loose.compare("Café", "CAFE")));  // snippet: equal
        System.out.println("same key: " + (loose.key("Café").equals(loose.key("CAFE")) ? "yes" : "no"));  // snippet: equal
        // Or compare numbers by value alone, whatever their leading zeros
        // or digit script.
        Order byValue = new Order.Builder().ignoreNumberForms(true).build();  // snippet: equal
        System.out.println("ignoring number forms, file01 vs file1: " + order(byValue.compare("file01", "file1")));  // snippet: equal

        section("4. Sorting your own types");

        // sortSmartByKey sorts any items by a string from each, made once each.
        List<Track> tracks = List.of(new Track("Track 10: Outro", 95), new Track("Track 1: Intro", 61), new Track("Track 2: Rise", 184));  // snippet: by-key
        List<Track> byTitle = sortSmartByKey(tracks, Track::title);  // snippet: by-key
        System.out.println("tracks by title:");
        for (Track track : byTitle) {
            System.out.println("  " + track.title() + " (" + track.seconds() + " s)");
        }

        // Or sort with the language's own tools, using compareSmart to compare.
        List<String> own = tracks.stream()
            .sorted(Comparator.comparing(Track::title, OrdableGlobal::compareSmart))
            .map(Track::title)
            .toList();
        System.out.println("with the language's own sort: " + String.join(", ", own));
    }
}

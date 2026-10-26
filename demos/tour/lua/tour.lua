-- A tour of Ordable's whole public API, from Lua.
--
-- The same tour exists for each language Ordable supports, and they all print
-- the same text. See ../README.md for how to run them.

local ordable = require("ordable")
local compareNatural, compareNaturalIgnoringCase = ordable.compareNatural, ordable.compareNaturalIgnoringCase
local sortNatural, sortNaturalIgnoringCase = ordable.sortNatural, ordable.sortNaturalIgnoringCase
local sortNaturalByKey = ordable.sortNaturalByKey

local function order(n)
  if n < 0 then return "before" elseif n > 0 then return "after" else return "same" end
end

local function section(title)
  print()
  print("## " .. title)
end

print("# Ordable tour")

section("1. Comparing")

-- Negative means the first comes first, positive the second, and 0 only for
-- the same string.
for _, pair in ipairs({ { "file2", "file10" }, { "x01", "x1" }, { "1.9", "1.10" }, { "file٢", "file10" }, { "a", "B" }, { "file10", "file10" } }) do
  print(pair[1] .. " vs " .. pair[2] .. ": " .. order(compareNatural(pair[1], pair[2])))
end

-- Ignoring case, letters compare as lowercase, and case only breaks ties.
for _, pair in ipairs({ { "a", "B" }, { "A", "a" } }) do
  print(pair[1] .. " vs " .. pair[2] .. ", ignoring case: " .. order(compareNaturalIgnoringCase(pair[1], pair[2])))
end

section("2. Sorting strings")

local files = { "img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png" }
print("files: " .. table.concat(sortNatural(files), " "))
print("ignoring case: " .. table.concat(sortNaturalIgnoringCase(files), " "))

-- Numbers of any length, and leading zeros only breaking ties.
local versions = { "v1.10", "v2.0", "v1.9", "v10.1", "v1.2" }
print("versions: " .. table.concat(sortNatural(versions), " "))
local big = { "n123456789012345678901234567890", "n9", "n99999999999999999999" }
print("big numbers: " .. table.concat(sortNatural(big), " "))
print("leading zeros: " .. table.concat(sortNatural({ "2", "001", "1", "01" }), " "))

-- Natural keys sort by plain string comparison, as in a database.
print("natural keys, file2 before file10: " .. (ordable.naturalKey("file2") < ordable.naturalKey("file10") and "yes" or "no"))
-- Keys are the same in every language, so they can be stored and shared.
-- (This key is all ASCII, so its bytes are its code points.)
local hex = {}
for _, byte in ipairs({ ordable.naturalKey("file10"):byte(1, -1) }) do
  hex[#hex + 1] = string.format("%X", byte)
end
print("key for file10: " .. table.concat(hex, " "))

section("3. Sorting your own types")

-- sortNaturalByKey sorts any items by a string from each, made once each.
local tracks = {
  { title = "Track 10: Outro", seconds = 95 },
  { title = "Track 1: Intro", seconds = 61 },
  { title = "Track 2: Rise", seconds = 184 },
}
local byTitle = sortNaturalByKey(tracks, function(track) return track.title end)
print("tracks by title:")
for _, track in ipairs(byTitle) do
  print("  " .. track.title .. " (" .. track.seconds .. " s)")
end

-- Or sort with the language's own tools, using compareNatural to compare.
-- table.sort isn't stable, which doesn't matter for distinct titles.
local own = { table.unpack(tracks) }
table.sort(own, function(a, b) return compareNatural(a.title, b.title) < 0 end)
local titles = {}
for _, track in ipairs(own) do titles[#titles + 1] = track.title end
print("with the language's own sort: " .. table.concat(titles, ", "))

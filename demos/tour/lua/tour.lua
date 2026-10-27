-- A tour of Ordable's whole public API, from Lua.
--
-- The same tour exists for each language Ordable supports, and they all print
-- the same text. See ../README.md for how to run them.

local ordable = require("ordable")
local compareNatural, sortNatural, sortNaturalByKey = ordable.compareNatural, ordable.sortNatural, ordable.sortNaturalByKey
local Order = ordable.Order

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
-- the same string. Case only breaks ties, lowercase first.
local pairs = {  -- snippet: compare
  { "file2", "file10" }, { "x01", "x1" }, { "1.9", "1.10" }, { "file٢", "file10" },  -- snippet: compare
  { "a", "B" }, { "a", "A" }, { "file10", "file10" },  -- snippet: compare
}  -- snippet: compare
for _, pair in ipairs(pairs) do  -- snippet: compare
  print(pair[1] .. " vs " .. pair[2] .. ": " .. order(compareNatural(pair[1], pair[2])))  -- snippet: compare
end  -- snippet: compare

section("2. Sorting strings")

local files = { "img12.png", "img10.png", "IMG2.png", "img1.png", "img2.png" }  -- snippet: sort, options
print("files: " .. table.concat(sortNatural(files), " "))  -- snippet: sort

-- Numbers of any length, and leading zeros only breaking ties.
local versions = { "v1.10", "v2.0", "v1.9", "v10.1", "v1.2" }  -- snippet: numbers
print("versions: " .. table.concat(sortNatural(versions), " "))  -- snippet: numbers
local big = { "n123456789012345678901234567890", "n9", "n99999999999999999999" }  -- snippet: numbers
print("big numbers: " .. table.concat(sortNatural(big), " "))  -- snippet: numbers
print("leading zeros: " .. table.concat(sortNatural({ "2", "001", "1", "01" }), " "))  -- snippet: ties

-- Natural keys sort by plain string comparison, as in a database.
print("natural keys, file2 before file10: " .. (ordable.naturalKey("file2") < ordable.naturalKey("file10") and "yes" or "no"))  -- snippet: keys
-- Keys are the same in every language, so they can be stored and shared.
-- (This key is all ASCII, so its bytes are its code points.)
local hex = {}  -- snippet: keys
for _, byte in ipairs({ ordable.naturalKey("file10"):byte(1, -1) }) do  -- snippet: keys
  hex[#hex + 1] = string.format("%X", byte)  -- snippet: keys
end  -- snippet: keys
print("key for file10: " .. table.concat(hex, " "))  -- snippet: keys

section("3. Options")

-- An Order has the same functions as methods, with options: here
-- uppercase first, then grouped by case.
local upperFirst = Order(true)  -- snippet: options
print("uppercase first: " .. table.concat(upperFirst:sort(files), " "))  -- snippet: options
local grouped = Order(false, true)  -- snippet: options
print("grouped by case: " .. table.concat(grouped:sort(files), " "))  -- snippet: options
-- Or let different strings be equal, here ignoring accents and case,
-- with equal keys too.
local loose = Order(false, false, true, true)  -- snippet: equal
print("ignoring accents and case, Café vs CAFE: " .. order(loose:compare("Café", "CAFE")))  -- snippet: equal
print("same key: " .. (loose:key("Café") == loose:key("CAFE") and "yes" or "no"))  -- snippet: equal

section("4. Sorting your own types")

-- sortNaturalByKey sorts any items by a string from each, made once each.
local tracks = {  -- snippet: by-key
  { title = "Track 10: Outro", seconds = 95 },  -- snippet: by-key
  { title = "Track 1: Intro", seconds = 61 },  -- snippet: by-key
  { title = "Track 2: Rise", seconds = 184 },  -- snippet: by-key
}  -- snippet: by-key
local byTitle = sortNaturalByKey(tracks, function(track) return track.title end)  -- snippet: by-key
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

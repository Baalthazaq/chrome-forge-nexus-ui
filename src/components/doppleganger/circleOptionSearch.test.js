import { describe, expect, it } from "bun:test";
import { filterCircleOptions } from "./circleOptionSearch";

const groups = [
  { heading: "Aberration", items: [
    { label: "Beholder", depth: 0, ancestors: [] },
    { label: "Gith", depth: 0, ancestors: [] },
    { label: "Githyanki", depth: 1, ancestors: ["Gith"] },
  ] },
  { heading: "The Source", items: [
    { label: "Gnome", depth: 0, ancestors: [] },
    { label: "Air", depth: 1, ancestors: ["Gnome"] },
    { label: "Earth", depth: 1, ancestors: ["Gnome"] },
    { label: "Fairy", depth: 0, ancestors: [] },
  ] },
];

describe("circle option search", () => {
  it("keeps Air under Gnome without unrelated branches", () => {
    expect(filterCircleOptions(groups, "Air")).toEqual([
      { heading: "The Source", items: [groups[1].items[0], groups[1].items[1], groups[1].items[3]] },
    ]);
  });
  it("matches the middle of a word", () => {
    expect(filterCircleOptions(groups, "ithy")[0].items.map((item) => item.label)).toEqual(["Gith", "Githyanki"]);
  });
  it("keeps filtering when the search is also the saved selection", () => {
    const savedValue = "Air";
    expect(filterCircleOptions(groups, savedValue).some((group) => group.heading === "Aberration")).toBe(false);
  });
  it("does not expand a group just because its heading matches", () => {
    expect(filterCircleOptions(groups, "Aberration")).toEqual([]);
  });
});
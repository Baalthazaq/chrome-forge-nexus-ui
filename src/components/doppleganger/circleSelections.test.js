import { describe, expect, it } from "bun:test";
import { readCircleSelections, writeCircleSelections } from "./circleSelections";

describe("multiple race and transformation selections", () => {
  it("preserves existing single selections", () => {
    expect(readCircleSelections("Air")).toEqual(["Air"]);
    expect(writeCircleSelections(["Air"])).toBe("Air");
  });
  it("saves and restores additional races and transformations", () => {
    for (const values of [["Gnome", "Air"], ["Vampire", "Custom, form"]]) {
      expect(readCircleSelections(writeCircleSelections(values))).toEqual(values);
    }
  });
  it("drops blank entries without dropping filled selections", () => {
    expect(writeCircleSelections(["", "Air", " "])).toBe("Air");
    expect(readCircleSelections(writeCircleSelections(["", " "]))).toEqual([]);
  });
});
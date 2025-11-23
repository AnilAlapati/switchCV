import { pruneUndefined } from "./pruneUndefined";

describe("pruneUndefined", () => {
  it("should return undefined for undefined input", () => {
    expect(pruneUndefined(undefined)).toBeUndefined();
  });

  it("should return primitive values as is", () => {
    expect(pruneUndefined(null)).toBeNull();
    expect(pruneUndefined(0)).toBe(0);
    expect(pruneUndefined("")).toBe("");
    expect(pruneUndefined(false)).toBe(false);
    expect(pruneUndefined("hello")).toBe("hello");
    expect(pruneUndefined(123)).toBe(123);
  });

  it("should remove undefined values from arrays", () => {
    const input = [1, undefined, 2, undefined, 3];
    const expected = [1, 2, 3];
    expect(pruneUndefined(input)).toEqual(expected);
  });

  it("should return empty array if all elements are undefined", () => {
    const input = [undefined, undefined];
    expect(pruneUndefined(input)).toEqual([]);
  });

  it("should remove undefined values from objects", () => {
    const input = { a: 1, b: undefined, c: 3 };
    const expected = { a: 1, c: 3 };
    expect(pruneUndefined(input)).toEqual(expected);
  });

  it("should return empty object if all values are undefined", () => {
    const input = { a: undefined, b: undefined };
    expect(pruneUndefined(input)).toEqual({});
  });

  it("should handle nested structures", () => {
    const input = {
      a: 1,
      b: [2, undefined, { c: 3, d: undefined }],
      e: { f: 4, g: undefined },
      h: undefined,
    };
    const expected = {
      a: 1,
      b: [2, { c: 3 }],
      e: { f: 4 },
    };
    expect(pruneUndefined(input)).toEqual(expected);
  });

  it("should handle empty arrays and objects", () => {
    expect(pruneUndefined([])).toEqual([]);
    expect(pruneUndefined({})).toEqual({});
  });
});

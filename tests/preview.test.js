import { describe, expect, it } from "vitest";
import { previewText } from "../src/preview.js";

describe("previewText", () => {
  it("turns Markdown into short plain text", () => {
    const markdown = [
      "# Title",
      "",
      "Some **bold** text with `code` and a [link](https://x.y) plus ![img](https://i.png).",
      "",
      "- item one",
      "1. first",
      "",
      "```js",
      "const a = 1;",
      "```",
      "<b>html</b> end",
    ].join("\n");

    expect(previewText(markdown)).toBe(
      "Title Some bold text with and a link plus img. item one first html end",
    );
  });

  it("handles empty descriptions", () => {
    expect(previewText(null)).toBe("No description provided.");
  });

  it("shortens long text to 180 characters plus an ellipsis", () => {
    const preview = previewText("word ".repeat(100));
    expect(preview.endsWith("...")).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(183);
  });

  // These inputs used to make the page freeze for several seconds.
  it.each([
    ["newlines", "\n".repeat(65536)],
    ["newline and space pairs", "\n ".repeat(32768)],
    ["open brackets", "[".repeat(65536)],
    ["image openers", "![".repeat(32768)],
    ["angle brackets", "<".repeat(65536)],
    ["numbered lines", "1.\n".repeat(21845)],
  ])("stays fast on hostile input: %s", (_, body) => {
    const start = performance.now();
    previewText(body);
    expect(performance.now() - start).toBeLessThan(50);
  });
});

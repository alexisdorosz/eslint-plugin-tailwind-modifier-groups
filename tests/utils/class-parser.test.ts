import { describe, it, expect } from "vitest";
import {
	parseClasses,
	parseClass,
	extractModifier,
} from "../../src/utils/class-parser.js";

describe("class-parser", () => {
	describe("parseClass", () => {
		it("should parse base classes (no modifier)", () => {
			expect(parseClass("bg-red")).toEqual({
				full: "bg-red",
				modifier: null,
				base: "bg-red",
			});
		});

		it("should parse simple modifier classes", () => {
			expect(parseClass("hover:bg-red")).toEqual({
				full: "hover:bg-red",
				modifier: "hover:",
				base: "bg-red",
			});
		});

		it("should parse chained modifiers (rightmost colon)", () => {
			expect(parseClass("md:hover:bg-red")).toEqual({
				full: "md:hover:bg-red",
				modifier: "md:hover:",
				base: "bg-red",
			});
		});

		it("should handle complex chained modifiers", () => {
			expect(parseClass("dark:aria-invalid:ring-2")).toEqual({
				full: "dark:aria-invalid:ring-2",
				modifier: "dark:aria-invalid:",
				base: "ring-2",
			});
		});

		it("should handle empty string", () => {
			expect(parseClass("")).toEqual({
				full: "",
				modifier: null,
				base: "",
			});
		});

		it("should handle classes with multiple colons in base", () => {
			expect(parseClass("hover:bg-[#ff0000]")).toEqual({
				full: "hover:bg-[#ff0000]",
				modifier: "hover:",
				base: "bg-[#ff0000]",
			});
		});
	});

	describe("parseClasses", () => {
		it("should parse multiple classes", () => {
			const result = parseClasses("hover:bg-red bg-blue focus:ring-2");
			expect(result).toHaveLength(3);
			expect(result[0]).toEqual({
				full: "hover:bg-red",
				modifier: "hover:",
				base: "bg-red",
			});
			expect(result[1]).toEqual({
				full: "bg-blue",
				modifier: null,
				base: "bg-blue",
			});
			expect(result[2]).toEqual({
				full: "focus:ring-2",
				modifier: "focus:",
				base: "ring-2",
			});
		});

		it("should handle whitespace", () => {
			const result = parseClasses("  hover:bg-red   bg-blue  ");
			expect(result).toHaveLength(2);
			expect(result[0].full).toBe("hover:bg-red");
			expect(result[1].full).toBe("bg-blue");
		});

		it("should handle empty string", () => {
			expect(parseClasses("")).toEqual([]);
			expect(parseClasses("   ")).toEqual([]);
		});

		it("should handle single class", () => {
			const result = parseClasses("bg-red");
			expect(result).toHaveLength(1);
			expect(result[0].full).toBe("bg-red");
		});
	});

	describe("extractModifier", () => {
		it("should extract modifier from class with modifier", () => {
			expect(extractModifier("hover:bg-red")).toBe("hover:");
		});

		it("should return null for base classes", () => {
			expect(extractModifier("bg-red")).toBe(null);
		});

		it("should extract chained modifier", () => {
			expect(extractModifier("md:hover:bg-red")).toBe("md:hover:");
		});

		it("should handle empty string", () => {
			expect(extractModifier("")).toBe(null);
		});
	});
});


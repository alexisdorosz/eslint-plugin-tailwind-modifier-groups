import { describe, it, expect } from "vitest";
import {
	groupClassesByModifier,
	createModifierGroups,
	groupClassString,
	hasMultipleModifierGroups,
	mixesBaseAndModifiers,
	hasSplitModifiers,
} from "../../src/utils/class-grouper.js";

describe("class-grouper", () => {
	describe("groupClassesByModifier", () => {
		it("should group classes by modifier", () => {
			const result = groupClassesByModifier([
				"hover:bg-red",
				"hover:text-white",
				"bg-blue",
				"focus:ring-2",
			]);

			expect(result.size).toBe(3);
			expect(result.get("hover:")).toEqual(["hover:bg-red", "hover:text-white"]);
			expect(result.get(null)).toEqual(["bg-blue"]);
			expect(result.get("focus:")).toEqual(["focus:ring-2"]);
		});

		it("should handle base classes only", () => {
			const result = groupClassesByModifier(["bg-red", "text-white"]);
			expect(result.size).toBe(1);
			expect(result.get(null)).toEqual(["bg-red", "text-white"]);
		});

		it("should handle empty array", () => {
			const result = groupClassesByModifier([]);
			expect(result.size).toBe(0);
		});
	});

	describe("createModifierGroups", () => {
		it("should create modifier groups from parsed classes", () => {
			const parsed = [
				{ full: "hover:bg-red", modifier: "hover:", base: "bg-red" },
				{ full: "hover:text-white", modifier: "hover:", base: "text-white" },
				{ full: "bg-blue", modifier: null, base: "bg-blue" },
			];

			const result = createModifierGroups(parsed);
			expect(result).toHaveLength(2);
			expect(result.find((g) => g.modifier === "hover:")?.classes).toEqual([
				"hover:bg-red",
				"hover:text-white",
			]);
			expect(result.find((g) => g.modifier === null)?.classes).toEqual([
				"bg-blue",
			]);
		});
	});

	describe("groupClassString", () => {
		it("should group classes from a string", () => {
			const result = groupClassString("hover:bg-red hover:text-white bg-blue");
			expect(result).toHaveLength(2);
			expect(result.find((g) => g.modifier === "hover:")?.classes).toEqual([
				"hover:bg-red",
				"hover:text-white",
			]);
			expect(result.find((g) => g.modifier === null)?.classes).toEqual([
				"bg-blue",
			]);
		});

		it("should handle single modifier group", () => {
			const result = groupClassString("hover:bg-red hover:text-white");
			expect(result).toHaveLength(1);
			expect(result[0].modifier).toBe("hover:");
			expect(result[0].classes).toEqual(["hover:bg-red", "hover:text-white"]);
		});

		it("should handle base classes only", () => {
			const result = groupClassString("bg-red text-white");
			expect(result).toHaveLength(1);
			expect(result[0].modifier).toBe(null);
			expect(result[0].classes).toEqual(["bg-red", "text-white"]);
		});
	});

	describe("hasMultipleModifierGroups", () => {
		it("should return true for multiple modifier groups", () => {
			expect(hasMultipleModifierGroups("hover:bg-red focus:ring-2")).toBe(true);
			expect(hasMultipleModifierGroups("bg-red hover:bg-blue")).toBe(true);
		});

		it("should return false for single modifier group", () => {
			expect(hasMultipleModifierGroups("hover:bg-red hover:text-white")).toBe(
				false,
			);
			expect(hasMultipleModifierGroups("bg-red text-white")).toBe(false);
		});

		it("should return false for empty string", () => {
			expect(hasMultipleModifierGroups("")).toBe(false);
		});
	});

	describe("mixesBaseAndModifiers", () => {
		it("should return true when base and modifiers are mixed", () => {
			expect(mixesBaseAndModifiers("bg-red hover:text-white")).toBe(true);
			expect(mixesBaseAndModifiers("hover:bg-red bg-blue")).toBe(true);
		});

		it("should return false for base classes only", () => {
			expect(mixesBaseAndModifiers("bg-red text-white")).toBe(false);
		});

		it("should return false for modifier classes only", () => {
			expect(mixesBaseAndModifiers("hover:bg-red hover:text-white")).toBe(
				false,
			);
		});

		it("should return false for empty string", () => {
			expect(mixesBaseAndModifiers("")).toBe(false);
		});
	});

	describe("hasSplitModifiers", () => {
		it("should return true when same modifier is split", () => {
			expect(hasSplitModifiers(["hover:bg-red", "hover:text-white"])).toBe(
				true,
			);
		});

		it("should return false when modifiers are in separate strings", () => {
			expect(hasSplitModifiers(["hover:bg-red", "focus:ring-2"])).toBe(false);
		});

		it("should return false when same modifier is in one string", () => {
			expect(hasSplitModifiers(["hover:bg-red hover:text-white"])).toBe(
				false,
			);
		});

		it("should return true for complex split scenario", () => {
			expect(
				hasSplitModifiers([
					"hover:bg-red",
					"bg-blue",
					"hover:text-white",
					"focus:ring-2",
				]),
			).toBe(true);
		});

		it("should handle empty array", () => {
			expect(hasSplitModifiers([])).toBe(false);
		});
	});
});


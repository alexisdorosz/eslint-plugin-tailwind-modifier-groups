import { describe, it, expect } from "vitest";
import {
	getModifierPriority,
	getModifierSortOrder,
	compareModifiers,
	sortModifierGroups,
	sortClassesInGroup,
	sortClassesByModifierGroups,
} from "../../src/utils/class-sorter.js";
import { ModifierPriority } from "../../src/constants/index.js";

describe("class-sorter", () => {
	describe("getModifierPriority", () => {
		it("should return BASE for null modifier", () => {
			expect(getModifierPriority(null)).toBe(ModifierPriority.BASE);
		});

		it("should return PSEUDO_CLASS for pseudo-class variants", () => {
			expect(getModifierPriority("hover:")).toBe(ModifierPriority.PSEUDO_CLASS);
			expect(getModifierPriority("focus:")).toBe(ModifierPriority.PSEUDO_CLASS);
		});

		it("should return RESPONSIVE for responsive variants", () => {
			expect(getModifierPriority("md:")).toBe(ModifierPriority.RESPONSIVE);
			expect(getModifierPriority("lg:")).toBe(ModifierPriority.RESPONSIVE);
		});

		it("should return CHAINED for chained modifiers", () => {
			expect(getModifierPriority("md:hover:")).toBe(ModifierPriority.CHAINED);
			expect(getModifierPriority("lg:focus:")).toBe(ModifierPriority.CHAINED);
		});

		it("should return DARK for dark mode", () => {
			expect(getModifierPriority("dark:")).toBe(ModifierPriority.DARK);
		});

		it("should return ARIA_DATA for aria variants", () => {
			expect(getModifierPriority("aria-invalid:")).toBe(
				ModifierPriority.ARIA_DATA,
			);
		});

		it("should return ARIA_DATA for data variants", () => {
			expect(getModifierPriority("data-active:")).toBe(
				ModifierPriority.ARIA_DATA,
			);
		});

		it("should return ARBITRARY for arbitrary variants", () => {
			expect(getModifierPriority("[&_svg]:")).toBe(ModifierPriority.ARBITRARY);
		});

		it("should return UNKNOWN for unknown modifiers", () => {
			expect(getModifierPriority("unknown:")).toBe(ModifierPriority.UNKNOWN);
		});
	});

	describe("getModifierSortOrder", () => {
		it("should return 0 for null modifier", () => {
			expect(getModifierSortOrder(null)).toBe(0);
		});

		it("should return known order for focus", () => {
			const order = getModifierSortOrder("focus:");
			expect(order).toBeGreaterThan(0);
			expect(order).toBeLessThan(1000);
		});

		it("should return known order for hover", () => {
			const order = getModifierSortOrder("hover:");
			expect(order).toBeGreaterThan(0);
			expect(order).toBeLessThan(1000);
		});

		it("should return higher order for chained modifiers", () => {
			const order = getModifierSortOrder("md:hover:");
			expect(order).toBeGreaterThan(1000);
		});
	});

	describe("compareModifiers", () => {
		it("should sort base classes first", () => {
			expect(compareModifiers(null, "hover:")).toBeLessThan(0);
		});

		it("should sort pseudo-class before responsive", () => {
			expect(compareModifiers("hover:", "md:")).toBeLessThan(0);
		});

		it("should sort focus before hover", () => {
			expect(compareModifiers("focus:", "hover:")).toBeLessThan(0);
		});

		it("should sort responsive before dark", () => {
			expect(compareModifiers("md:", "dark:")).toBeLessThan(0);
		});

		it("should return 0 for same modifiers", () => {
			expect(compareModifiers("hover:", "hover:")).toBe(0);
		});
	});

	describe("sortModifierGroups", () => {
		it("should sort groups by modifier priority", () => {
			const groups = [
				{ modifier: "md:", classes: ["md:p-4"] },
				{ modifier: null, classes: ["bg-red"] },
				{ modifier: "hover:", classes: ["hover:bg-blue"] },
			];

			const sorted = sortModifierGroups(groups);
			expect(sorted[0].modifier).toBe(null); // Base first
			expect(sorted[1].modifier).toBe("hover:"); // Pseudo-class before responsive
			expect(sorted[2].modifier).toBe("md:");
		});

		it("should sort focus before hover", () => {
			const groups = [
				{ modifier: "hover:", classes: ["hover:bg-blue"] },
				{ modifier: "focus:", classes: ["focus:ring-2"] },
			];

			const sorted = sortModifierGroups(groups);
			expect(sorted[0].modifier).toBe("focus:");
			expect(sorted[1].modifier).toBe("hover:");
		});
	});

	describe("sortClassesInGroup", () => {
		it("should sort classes alphabetically", () => {
			const classes = ["hover:text-white", "hover:bg-red", "hover:p-4"];
			const sorted = sortClassesInGroup(classes);
			expect(sorted).toEqual(["hover:bg-red", "hover:p-4", "hover:text-white"]);
		});

		it("should handle empty array", () => {
			expect(sortClassesInGroup([])).toEqual([]);
		});

		it("should handle single class", () => {
			expect(sortClassesInGroup(["hover:bg-red"])).toEqual(["hover:bg-red"]);
		});
	});

	describe("sortClassesByModifierGroups", () => {
		it("should group and sort classes correctly", () => {
			const classes = [
				"md:p-4",
				"hover:bg-blue",
				"bg-red",
				"hover:text-white",
				"focus:ring-2",
			];

			const result = sortClassesByModifierGroups(classes);
			expect(result).toHaveLength(4);

			// Base classes first
			expect(result[0].modifier).toBe(null);
			expect(result[0].classes).toEqual(["bg-red"]);

			// Focus before hover
			expect(result[1].modifier).toBe("focus:");
			expect(result[1].classes).toEqual(["focus:ring-2"]);

			// Hover classes grouped together
			expect(result[2].modifier).toBe("hover:");
			expect(result[2].classes).toEqual(["hover:bg-blue", "hover:text-white"]);

			// Responsive last
			expect(result[3].modifier).toBe("md:");
			expect(result[3].classes).toEqual(["md:p-4"]);
		});
	});
});


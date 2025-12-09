import { describe, it, expect } from "vitest";
import { verifyFixNonDestructive } from "../../src/utils/fix-generator.js";

describe("fix-generator", () => {
	// Note: Fix generation functions are tested indirectly through rule tests
	// as they require complex AST setup with RuleTester

	describe("verifyFixNonDestructive", () => {
		it("should verify that all input classes are in output", () => {
			const inputClasses = ["hover:bg-red", "bg-blue"];
			const outputCode = 'cn("bg-blue", "hover:bg-red")';
			expect(verifyFixNonDestructive(inputClasses, outputCode)).toBe(true);
		});

		it("should detect missing classes", () => {
			const inputClasses = ["hover:bg-red", "bg-blue", "focus:ring-2"];
			const outputCode = 'cn("bg-blue", "hover:bg-red")';
			expect(verifyFixNonDestructive(inputClasses, outputCode)).toBe(false);
		});

		it("should detect extra classes", () => {
			const inputClasses = ["hover:bg-red"];
			const outputCode = 'cn("bg-blue", "hover:bg-red")';
			expect(verifyFixNonDestructive(inputClasses, outputCode)).toBe(false);
		});
	});
});


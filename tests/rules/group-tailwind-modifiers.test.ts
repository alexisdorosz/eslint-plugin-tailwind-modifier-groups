import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import { groupTailwindModifiers } from "../../src/rules/group-tailwind-modifiers.js";

const ruleTester = new RuleTester({
	languageOptions: {
		ecmaVersion: 2022,
		sourceType: "module",
		parserOptions: {
			ecmaFeatures: {
				jsx: true,
			},
		},
	},
});

describe("group-tailwind-modifiers", () => {
	describe("standard function calls (cn, clsx)", () => {
		it("should pass when classes are properly grouped", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [
					'cn("bg-red", "hover:bg-blue hover:text-white")',
					'cn("bg-red", "focus:ring-2", "hover:bg-blue")',
					'clsx("bg-red", "hover:bg-blue")',
					'cn("bg-red text-white")', // Only base classes
					'cn("hover:bg-blue hover:text-white")', // Only one modifier group
				],
				invalid: [],
			});
		});

		it("should detect split modifiers", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [],
				invalid: [
					{
						code: 'cn("hover:bg-red", "hover:text-white")',
						errors: [{ messageId: "splitModifier" }],
						output: 'cn("hover:bg-red hover:text-white")',
					},
					{
						code: 'customFn("hover:bg-red", "hover:text-white")',
						options: [{ classFunctions: ["customFn"] }],
						errors: [{ messageId: "splitModifier" }],
						output: 'customFn("hover:bg-red hover:text-white")',
					},
					{
						code: 'cn("focus:ring-2", "hover:bg-red", "focus:ring-blue")',
						errors: [{ messageId: "splitModifier" }],
						output: 'cn("focus:ring-2 focus:ring-blue", "hover:bg-red")',
					},
				],
			});
		});

		it("should detect multiple modifier groups in one argument", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [],
				invalid: [
					{
						code: 'cn("hover:bg-red focus:ring-2")',
						errors: [{ messageId: "multipleModifierGroups" }],
						output: 'cn("focus:ring-2", "hover:bg-red")',
					},
					{
						code: 'cn("hover:bg-red md:p-4 focus:ring-2")',
						errors: [{ messageId: "multipleModifierGroups" }],
						output: 'cn("focus:ring-2", "hover:bg-red", "md:p-4")',
					},
				],
			});
		});

		it("should detect mixed base and modifiers", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [],
				invalid: [
					{
						code: 'cn("bg-red hover:text-white")',
						errors: [{ messageId: "mixedBaseAndModifiers" }],
						output: 'cn("bg-red", "hover:text-white")',
					},
					{
						code: 'cn("hover:bg-red bg-blue")',
						errors: [{ messageId: "mixedBaseAndModifiers" }],
						output: 'cn("bg-blue", "hover:bg-red")',
					},
				],
			});
		});

		it("should handle complex scenarios", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [],
				invalid: [
					{
						code: 'cn("hover:bg-red", "bg-blue", "hover:text-white", "focus:ring-2", "md:p-4")',
						errors: [{ messageId: "splitModifier" }],
						output: 'cn("bg-blue", "focus:ring-2", "hover:bg-red hover:text-white", "md:p-4")',
					},
				],
			});
		});

		it("should preserve non-string arguments (variables, expressions)", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [],
				invalid: [
					{
						code: 'cn("bg-red hover:text-white", className)',
						errors: [{ messageId: "mixedBaseAndModifiers" }],
						output: 'cn("bg-red", "hover:text-white", className)',
					},
					{
						code: 'cn("hover:bg-red", "hover:text-white", className)',
						errors: [{ messageId: "splitModifier" }],
						output: 'cn("hover:bg-red hover:text-white", className)',
					},
					{
						code: 'cn("bg-red hover:text-white focus:ring-2", className)',
						errors: [{ messageId: "mixedBaseAndModifiers" }],
						output: 'cn("bg-red", "focus:ring-2", "hover:text-white", className)',
					},
					{
						code: 'cn("hover:bg-red focus:ring-2", className)',
						errors: [{ messageId: "multipleModifierGroups" }],
						output: 'cn("focus:ring-2", "hover:bg-red", className)',
					},
				],
			});
		});
	});

	describe("JSX attributes", () => {
		it("should pass when classes are properly grouped", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [
					'<div className="bg-red text-white" />',
					'<div className="hover:bg-blue hover:text-white" />',
					'<div className={cn("bg-red", "hover:bg-blue")} />',
				],
				invalid: [],
			});
		});

		it("should detect mixed base and modifiers in JSX", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [],
				invalid: [
					{
						code: '<div className="bg-red hover:text-white" />',
						errors: [{ messageId: "complexJSXAttribute" }],
						output: '<div className={cn("bg-red", "hover:text-white")} />',
					},
				],
			});
		});

		it("should detect multiple modifier groups in JSX", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [],
				invalid: [
					{
						code: '<div className="hover:bg-blue focus:ring-2" />',
						errors: [{ messageId: "complexJSXAttribute" }],
						output: '<div className={cn("focus:ring-2", "hover:bg-blue")} />',
					},
				],
			});
		});
	});

	describe("cva function calls", () => {
		it("should pass when base classes are properly separated", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [
					'cva("bg-red", { variants: { size: { sm: "px-2" } } })',
					'cva(cn("bg-red", "hover:text-white"), { variants: {} })',
				],
				invalid: [],
			});
		});

		it("should detect mixed base and modifiers in cva base", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [],
				invalid: [
					{
						code: 'cva("bg-red hover:text-white", { variants: {} })',
						options: [{ classFunctions: ["cva"] }],
						errors: [{ messageId: "mixedBaseAndModifiers" }],
						output: 'cva(cn("bg-red", "hover:text-white"), { variants: {} })',
					},
				],
			});
		});

		it("should detect violations in cva variant values", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [],
				invalid: [
					{
						code: 'cva("base", { variants: { size: { sm: "px-2 hover:bg-blue focus:ring-2" } } })',
						options: [{ classFunctions: ["cva"] }],
						errors: [{ messageId: "complexProperty" }],
						output: 'cva("base", { variants: { size: { sm: cn("px-2", "focus:ring-2", "hover:bg-blue") } } })',
					},
					{
						code: 'cva("base", { variants: { size: { sm: "px-2 hover:bg-blue" } } })',
						options: [{ classFunctions: ["cva"] }],
						errors: [{ messageId: "complexProperty" }],
						output: 'cva("base", { variants: { size: { sm: cn("px-2", "hover:bg-blue") } } })',
					},
				],
			});
		});
	});

	describe("tv function calls", () => {
		it("should pass when base classes are properly separated", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [
					{
						code: 'tv({ base: "bg-red", variants: { size: { sm: "px-2" } } })',
						options: [{ classFunctions: ["tv"] }],
					},
					{
						code: 'tv({ base: cn("bg-red", "hover:text-white"), variants: {} })',
						options: [{ classFunctions: ["tv"] }],
					},
				],
				invalid: [],
			});
		});

		it("should detect mixed base and modifiers in tv base", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [],
				invalid: [
					{
						code: 'tv({ base: "bg-red hover:text-white", variants: {} })',
						options: [{ classFunctions: ["tv"] }],
						errors: [{ messageId: "mixedBaseAndModifiers" }],
						output: 'tv({ base: cn("bg-red", "hover:text-white"), variants: {} })',
					},
				],
			});
		});

		it("should detect violations in tv variant values", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [],
				invalid: [
					{
						code: 'tv({ base: "font-semibold", variants: { size: { sm: "px-2 hover:bg-blue" } } })',
						options: [{ classFunctions: ["tv"] }],
						errors: [{ messageId: "complexProperty" }],
						output: 'tv({ base: "font-semibold", variants: { size: { sm: cn("px-2", "hover:bg-blue") } } })',
					},
				],
			});
		});
	});

	describe("edge cases", () => {
		it("should handle empty strings", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: ['cn("", "bg-red")', 'cn("bg-red", "")'],
				invalid: [],
			});
		});

		it("should handle template literals without expressions", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: ["cn(`bg-red`, `hover:bg-blue`)"],
				invalid: [
					{
						code: "cn(`hover:bg-red`, `hover:text-white`)",
						errors: [{ messageId: "splitModifier" }],
						// Note: Fix converts template literals to string literals for consistency
						output: 'cn("hover:bg-red hover:text-white")',
					},
				],
			});
		});

		it("should skip template literals with expressions", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: ['cn(`bg-${color}`, "hover:bg-blue")'],
				invalid: [],
			});
		});

		it("should skip non-string arguments", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [
					'cn("bg-red", condition && "hover:bg-blue")',
					'cn("bg-red", ["hover:bg-blue"])',
				],
				invalid: [],
			});
		});

		it("should handle whitespace-only strings", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: ['cn("   ", "bg-red")', 'cn("bg-red", "   ")'],
				invalid: [],
			});
		});

		it("should handle all empty string arguments", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: ['cn("", "")', 'cn("   ", "   ")'],
				invalid: [],
			});
		});

		it("should handle empty configuration arrays gracefully", () => {
			// Note: ESLint schema validation prevents testing invalid types,
			// but empty arrays are handled by our runtime validation
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [
					{
						code: 'cn("bg-red", "hover:bg-blue")',
						// Empty array should fall back to defaults (handled by runtime validation)
						options: [{ classFunctions: [] }],
					},
				],
				invalid: [],
			});
		});

		it("should handle JSX attributes with empty className", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [
					'<div className="" />',
					'<div className="   " />',
					'<div className={cn("")} />',
				],
				invalid: [],
			});
		});

		it("should handle cva with empty base classes", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [
					'cva("", { variants: { size: { sm: "px-2" } } })',
					'cva("   ", { variants: {} })',
				],
				invalid: [],
			});
		});

		it("should handle tv with empty base classes", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [
					{
						code: 'tv({ base: "", variants: { size: { sm: "px-2" } } })',
						options: [{ classFunctions: ["tv"] }],
					},
					{
						code: 'tv({ base: "   ", variants: {} })',
						options: [{ classFunctions: ["tv"] }],
					},
				],
				invalid: [],
			});
		});
	});

	describe("configuration options", () => {
		it("should respect custom classFunctions", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [
					{
						code: 'customFn("bg-red", "hover:bg-blue")',
						options: [{ classFunctions: ["customFn"] }],
					},
				],
				invalid: [
					{
						code: 'customFn("hover:bg-red", "hover:text-white")',
						options: [{ classFunctions: ["customFn"] }],
						errors: [{ messageId: "splitModifier" }],
						output: 'customFn("hover:bg-red hover:text-white")',
					},
				],
			});
		});

		it("should respect custom preferredFunction", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [],
				invalid: [
					{
						code: '<div className="bg-red hover:text-white" />',
						options: [{ preferredFunction: "clsx" }],
						errors: [{ messageId: "complexJSXAttribute" }],
						output: '<div className={clsx("bg-red", "hover:text-white")} />',
					},
				],
			});
		});

		it("should respect custom classAttributes", () => {
			ruleTester.run("group-tailwind-modifiers", groupTailwindModifiers, {
				valid: [],
				invalid: [
					{
						code: '<div class="bg-red hover:text-white" />',
						options: [{ classAttributes: ["class"] }],
						errors: [{ messageId: "complexJSXAttribute" }],
						output: '<div class={cn("bg-red", "hover:text-white")} />',
					},
				],
			});
		});
	});
});

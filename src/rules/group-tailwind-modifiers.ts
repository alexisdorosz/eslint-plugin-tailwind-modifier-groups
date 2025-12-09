import type { Rule } from "eslint";
import type { CallExpressionNode } from "../types/index.js";
import type { RuleOptions } from "../types/index.js";
import {
	DEFAULT_OPTIONS,
	isJSXAttributeWithIdentifier,
} from "../types/index.js";
import {
	hasSplitModifiers,
	hasMultipleModifierGroups,
	mixesBaseAndModifiers,
	getSplitModifier,
	getFirstTwoModifiers,
	getFirstModifier,
} from "../utils/class-grouper.js";
import { isClassFunction } from "../utils/function-detector.js";
import { detectFunctionPattern } from "../utils/pattern-detector.js";
import {
	extractArgumentInfo,
	extractJSXAttributeValue,
	extractVariantValues,
	extractBaseClasses,
	findBaseNode,
	findVariantPropertyNode,
} from "../utils/ast-traverser.js";
import {
	generateFunctionCallFix,
	generateJSXAttributeFix,
	generateVariantValueFix,
} from "../utils/fix-generator.js";
import { parseClasses } from "../utils/class-parser.js";
import {
	sortClassesByModifierGroups,
	sortClassesInGroup,
} from "../utils/class-sorter.js";

export const groupTailwindModifiers: Rule.RuleModule = {
	meta: {
		type: "layout",
		docs: {
			description:
				"Enforce proper grouping of Tailwind CSS classes by modifiers",
			recommended: true,
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					classFunctions: {
						type: "array",
						items: { type: "string" },
						description:
							"Function names to check and use for wrapping",
					},
					preferredFunction: {
						type: "string",
						description: "Function to use in auto-fixes",
					},
					classAttributes: {
						type: "array",
						items: { type: "string" },
						description: "JSX attribute names to check",
					},
				},
				additionalProperties: false,
			},
		],
		messages: {
			splitModifier:
				"Classes with the same modifier should be grouped together. Move all '{{modifier}}' classes into a single argument.",
			multipleModifierGroups:
				"Classes with different modifiers should be in separate arguments. Split '{{modifier1}}' and '{{modifier2}}' into separate arguments.",
			mixedBaseAndModifiers:
				"Base classes and modifier classes must be separated. Move base classes and '{{modifier}}' classes into separate arguments.",
			complexProperty:
				"Variant value contains multiple modifier groups or mixes base and modifiers. Wrap with '{{function}}()' to enable proper grouping.",
			complexJSXAttribute:
				"JSX attribute contains multiple modifier groups or mixes base and modifiers. Wrap with '{{function}}()' to enable proper grouping.",
		},
	},
	create(context) {
		// Validate and normalize options with defaults
		// ESLint schema validation handles most cases, but we add runtime validation for safety
		const rawOptions = context.options[0];
		const classFunctions =
			rawOptions?.classFunctions ?? DEFAULT_OPTIONS.classFunctions;
		const preferredFunction =
			rawOptions?.preferredFunction ?? DEFAULT_OPTIONS.preferredFunction;
		const classAttributes =
			rawOptions?.classAttributes ?? DEFAULT_OPTIONS.classAttributes;

		// Validate and sanitize options, falling back to defaults if invalid
		const options: Required<RuleOptions> = {
			classFunctions:
				Array.isArray(classFunctions) && classFunctions.length > 0
					? classFunctions.filter(
							(fn): fn is string =>
								typeof fn === "string" && fn.trim() !== ""
					  )
					: DEFAULT_OPTIONS.classFunctions,
			preferredFunction:
				typeof preferredFunction === "string" &&
				preferredFunction.trim() !== ""
					? preferredFunction.trim()
					: DEFAULT_OPTIONS.preferredFunction,
			classAttributes:
				Array.isArray(classAttributes) && classAttributes.length > 0
					? classAttributes.filter(
							(attr): attr is string =>
								typeof attr === "string" && attr.trim() !== ""
					  )
					: DEFAULT_OPTIONS.classAttributes,
		};

		return {
			// Handle function calls (cn, clsx, cva, tv, etc.)
			CallExpression(node) {
				// Get function name
				if (node.callee.type !== "Identifier") {
					return;
				}

				const functionName = node.callee.name;

				// Check if it's a class function
				if (!isClassFunction(functionName, options.classFunctions)) {
					return;
				}

				// Detect function pattern from AST structure (not function name)
				const pattern = detectFunctionPattern(node);

				// Handle based on pattern
				if (pattern.type === "standard") {
					handleStandardFunctionCall(node, context, options);
				} else {
					// Handle variant-based functions (cva-like or tv-like)
					handleVariantFunctionCall(node, context, options, pattern);
				}
			},

			// Handle JSX attributes
			JSXAttribute(node: unknown) {
				// Use type guard to ensure node has the expected structure
				if (isJSXAttributeWithIdentifier(node)) {
					// Check if it's a class attribute
					if (options.classAttributes.includes(node.name.name)) {
						// Extract class string - cast to JSXAttributeNode for the utility function
						// ESLint's types don't properly expose JSXAttribute, so we use type assertion
						const jsxAttributeNode =
							node as unknown as import("../types/index.js").JSXAttributeNode;
						const classString = extractJSXAttributeValue(
							jsxAttributeNode,
							context
						);
						if (classString) {
							// Determine the report node - prefer value if it exists, otherwise use the attribute itself
							const reportNode =
								node.value && "range" in node.value
									? (node.value as {
											type: string;
											range: [number, number];
									  })
									: (node as {
											type: string;
											range?: [number, number];
									  });

							// Check for violations
							if (mixesBaseAndModifiers(classString)) {
								context.report({
									node: reportNode,
									messageId: "complexJSXAttribute",
									data: {
										function: options.preferredFunction,
									},
									fix(fixer) {
										const fix = generateJSXAttributeFix(
											jsxAttributeNode,
											context,
											classString,
											options.preferredFunction
										);
										return fix
											? fixer.replaceTextRange(
													fix.range,
													fix.text
											  )
											: null;
									},
								});
								return;
							}

							if (hasMultipleModifierGroups(classString)) {
								context.report({
									node: reportNode,
									messageId: "complexJSXAttribute",
									data: {
										function: options.preferredFunction,
									},
									fix(fixer) {
										const fix = generateJSXAttributeFix(
											jsxAttributeNode,
											context,
											classString,
											options.preferredFunction
										);
										return fix
											? fixer.replaceTextRange(
													fix.range,
													fix.text
											  )
											: null;
									},
								});
							}
						}
					}
				}
			},
		};
	},
};

/**
 * Handle standard function calls (cn, clsx, etc.)
 *
 * This function processes standard class utility function calls like:
 * - cn("bg-red", "hover:bg-blue")
 * - clsx("text-white", "focus:ring-2")
 *
 * It checks for three types of violations in priority order:
 * 1. Split modifiers: Same modifier appears in multiple arguments
 * 2. Mixed base and modifiers: Base classes mixed with modifier classes in one argument
 * 3. Multiple modifier groups: Different modifiers in the same argument
 *
 * @param node - The CallExpression node representing the function call
 * @param context - ESLint rule context for reporting violations
 * @param options - Validated rule options
 */
function handleStandardFunctionCall(
	node: CallExpressionNode,
	context: Rule.RuleContext,
	options: Required<RuleOptions>
): void {
	// Extract information about all arguments (string and non-string)
	const argumentInfo = extractArgumentInfo(node, context);

	// Extract string arguments for validation checks
	const classStrings = argumentInfo
		.filter((info) => info.isStringLiteral && info.classString)
		.map((info) => info.classString!);

	// Early return if no string arguments found
	if (classStrings.length === 0) {
		return;
	}

	// Priority 1: Check for split modifiers (same modifier in multiple arguments)
	// Example: cn("hover:bg-red", "hover:text-white") -> should be cn("hover:bg-red hover:text-white")
	if (hasSplitModifiers(classStrings)) {
		const splitModifier = getSplitModifier(classStrings);
		context.report({
			node,
			messageId: "splitModifier",
			data: {
				modifier: splitModifier ?? "same modifier",
			},
			fix(fixer) {
				const fix = generateFunctionCallFix(
					node,
					context,
					argumentInfo,
					options.preferredFunction
				);
				return fix ? fixer.replaceTextRange(fix.range, fix.text) : null;
			},
		});
		return;
	}

	// Priority 2 & 3: Check each string argument for violations
	// We check arguments individually after checking for split modifiers
	// Note: We need to map string argument indices back to actual argument indices
	let stringArgIndex = 0;
	for (let i = 0; i < argumentInfo.length; i++) {
		const info = argumentInfo[i];

		// Skip non-string arguments for violation checking
		if (!info.isStringLiteral || !info.classString) {
			continue;
		}

		const classString = info.classString;

		// Priority 2: Check for mixed base and modifiers (takes priority over multiple modifier groups)
		// Example: cn("bg-red hover:text-white") -> should be cn("bg-red", "hover:text-white")
		if (mixesBaseAndModifiers(classString)) {
			const firstModifier = getFirstModifier(classString);
			context.report({
				node: node.arguments[i] || node,
				messageId: "mixedBaseAndModifiers",
				data: {
					modifier: firstModifier ?? "modifier classes",
				},
				fix(fixer) {
					const fix = generateFunctionCallFix(
						node,
						context,
						argumentInfo,
						options.preferredFunction
					);
					return fix
						? fixer.replaceTextRange(fix.range, fix.text)
						: null;
				},
			});
			return;
		}

		// Priority 3: Check for multiple modifier groups in one argument
		// Example: cn("hover:bg-red focus:ring-2") -> should be cn("focus:ring-2", "hover:bg-red")
		if (hasMultipleModifierGroups(classString)) {
			const modifiers = getFirstTwoModifiers(classString);
			context.report({
				node: node.arguments[i] || node,
				messageId: "multipleModifierGroups",
				data: {
					modifier1: modifiers?.[0] ?? "different modifiers",
					modifier2: modifiers?.[1] ?? "in same argument",
				},
				fix(fixer) {
					const fix = generateFunctionCallFix(
						node,
						context,
						argumentInfo,
						options.preferredFunction
					);
					return fix
						? fixer.replaceTextRange(fix.range, fix.text)
						: null;
				},
			});
			return;
		}

		stringArgIndex++;
	}
}

/**
 * Handle variant-based function calls (cva-like or tv-like patterns)
 * This works for any function that matches these patterns, not just cva/tv
 *
 * Supports two patterns:
 * 1. cva-like: fn(string, { variants: {... }}) - base in first arg, variants in second arg
 * 2. tv-like: fn({ base: string, variants: {... }}) - base and variants in first arg object
 *
 * This function:
 * 1. Checks base classes for violations (mixed base/modifiers or multiple modifier groups)
 * 2. Checks all variant property values for violations
 * 3. Reports violations and provides auto-fixes
 *
 * @param node - The CallExpression node representing the function call
 * @param context - ESLint rule context for reporting violations
 * @param options - Validated rule options
 * @param pattern - The detected function pattern (cva-like or tv-like)
 */
function handleVariantFunctionCall(
	node: CallExpressionNode,
	context: Rule.RuleContext,
	options: Required<RuleOptions>,
	pattern: import("../types/index.js").FunctionPattern
): void {
	// Step 1: Check base classes for violations
	// Base classes should not mix base and modifiers, or have multiple modifier groups
	const baseClasses = extractBaseClasses(node, context, pattern);
	if (baseClasses) {
		if (
			mixesBaseAndModifiers(baseClasses) ||
			hasMultipleModifierGroups(baseClasses)
		) {
			const baseNode = findBaseNode(node, context, pattern);
			if (baseNode) {
				const reportNode =
					baseNode.type === "Property"
						? baseNode.value || baseNode
						: baseNode;

				context.report({
					node: reportNode,
					messageId: "mixedBaseAndModifiers",
					data: {
						modifier: "modifier classes",
					},
					fix(fixer) {
						// Get classes and group them
						const parsed = parseClasses(baseClasses);
						const classes = parsed.map((p) => p.full);
						const groups = sortClassesByModifierGroups(classes);

						// Generate arguments for the class function
						const arguments_ = groups.map((group) => {
							const groupString = sortClassesInGroup(
								group.classes
							).join(" ");
							return `"${groupString.replace(/"/g, '\\"')}"`;
						});

						const newCode = `${
							options.preferredFunction
						}(${arguments_.join(", ")})`;

						// Get the value node to replace
						const valueNode =
							baseNode.type === "Property"
								? baseNode.value
								: baseNode;
						if (!valueNode || !valueNode.range) {
							return null;
						}

						const start = valueNode.range[0];
						const end = valueNode.range[1];

						return fixer.replaceTextRange([start, end], newCode);
					},
				});
			}
		}
	}

	// Step 2: Check variant values for violations
	// Each variant property value should not mix base and modifiers, or have multiple modifier groups
	const variantValues = extractVariantValues(node, context, pattern);
	for (const [path, classString] of variantValues.entries()) {
		if (
			mixesBaseAndModifiers(classString) ||
			hasMultipleModifierGroups(classString)
		) {
			// Find the property node for this variant value
			const propertyNode = findVariantPropertyNode(
				node,
				context,
				path,
				pattern
			);
			if (propertyNode) {
				context.report({
					node: propertyNode.value || propertyNode,
					messageId: "complexProperty",
					data: {
						function: options.preferredFunction,
					},
					fix(fixer) {
						const fix = generateVariantValueFix(
							propertyNode,
							context,
							classString,
							options.preferredFunction
						);
						return fix
							? fixer.replaceTextRange(fix.range, fix.text)
							: null;
					},
				});
			}
		}
	}
}

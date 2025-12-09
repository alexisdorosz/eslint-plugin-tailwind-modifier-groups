import type { Rule } from "eslint";
import type {
	CallExpressionNode,
	JSXAttributeNode,
	PropertyNode,
} from "../types/index.js";
import {
	mixesBaseAndModifiers,
	hasMultipleModifierGroups,
} from "./class-grouper.js";
import {
	sortClassesByModifierGroups,
	sortClassesInGroup,
} from "./class-sorter.js";
import { parseClasses } from "./class-parser.js";
import type { ArgumentInfo } from "./ast-traverser.js";

/**
 * Type definition for JSXAttribute value structure
 * ESLint's types don't properly expose this, so we define it here
 */
type JSXAttributeValue =
	| {
			type: "JSXExpressionContainer";
			expression: Rule.Node;
			range?: [number, number];
	  }
	| { type: "Literal"; value: unknown; range?: [number, number] };

/**
 * Type guard to check if a JSXAttribute value has a valid range
 *
 * @param val - The value to check
 * @returns True if the value has a valid range array
 */
function hasValidRange(
	val: JSXAttributeValue
): val is JSXAttributeValue & { range: [number, number] } {
	return (
		val.range !== undefined &&
		Array.isArray(val.range) &&
		val.range.length === 2
	);
}

/**
 * Process and group classes from a class string into function arguments
 * This is a shared utility used by multiple fix generation functions
 *
 * @param classString - The class string to process
 * @returns Array of escaped argument strings, or null if processing fails
 */
function processClassesIntoArguments(classString: string): string[] | null {
	// Handle edge case: empty class string
	if (!classString || classString.trim().length === 0) {
		return null;
	}

	// Parse and extract class names
	const parsedClasses = parseClasses(classString).map((p) => p.full);

	// Handle edge case: no parsed classes
	if (parsedClasses.length === 0) {
		return null;
	}

	// Group and sort classes by modifier
	const groups = sortClassesByModifierGroups(parsedClasses);

	// Handle edge case: no valid groups
	if (groups.length === 0) {
		return null;
	}

	// Generate arguments for the class function
	const arguments_ = groups
		.filter((group) => group.classes && group.classes.length > 0)
		.map((group) => {
			const groupString = sortClassesInGroup(group.classes).join(" ");
			return groupString ? `"${groupString.replace(/"/g, '\\"')}"` : null;
		})
		.filter((arg): arg is string => arg !== null);

	// Handle edge case: no valid arguments
	if (arguments_.length === 0) {
		return null;
	}

	return arguments_;
}

/**
 * Generate a fix for function call arguments
 * Reorganizes classes into proper modifier groups
 *
 * This function:
 * 1. Collects all classes from string literal arguments only
 * 2. Groups them by modifier
 * 3. Sorts groups and classes within groups
 * 4. Generates new properly-grouped string arguments
 * 5. Preserves non-string arguments (variables, expressions, etc.) in their original positions
 * 6. Returns null if no changes are needed or if edge cases prevent fixing
 *
 * Non-destructive principle: Only reorganizes string arguments, preserves all other arguments
 *
 * @param node - The CallExpression node
 * @param context - ESLint rule context
 * @param argumentInfo - Array of argument information (from extractArgumentInfo)
 * @param preferredFunction - The function name to use (for consistency)
 * @returns Fix object or null if no fix needed
 */
export function generateFunctionCallFix(
	node: CallExpressionNode,
	context: Rule.RuleContext,
	argumentInfo: ArgumentInfo[],
	preferredFunction: string
): Rule.Fix | null {
	// Collect all classes from string literal arguments only
	const allClasses: string[] = [];
	for (const info of argumentInfo) {
		if (info.isStringLiteral && info.classString) {
			const parsed = parseClasses(info.classString);
			allClasses.push(...parsed.map((p) => p.full));
		}
	}

	// Handle edge case: empty input
	if (allClasses.length === 0) {
		return null;
	}

	// Group and sort classes
	const groups = sortClassesByModifierGroups(allClasses);

	// Handle edge case: no valid groups after sorting
	if (groups.length === 0) {
		return null;
	}

	// Generate new string arguments from grouped classes
	const newStringArguments: string[] = [];
	for (const group of groups) {
		// Handle edge case: empty group classes
		if (!group.classes || group.classes.length === 0) {
			continue;
		}
		// Join classes in the group with spaces
		const groupString = sortClassesInGroup(group.classes).join(" ");
		if (groupString) {
			newStringArguments.push(groupString);
		}
	}

	// Handle edge case: no valid arguments after processing
	if (newStringArguments.length === 0) {
		return null;
	}

	// Build the complete argument list: new string arguments + preserved non-string arguments
	// Strategy: Replace all string arguments with new reorganized strings, preserve non-strings in place
	// All new string arguments are added at the position of the first original string argument
	const source = context.getSourceCode();
	const allArguments: string[] = [];
	let newStringArgIndex = 0;
	let hasAddedNewStrings = false;

	for (const info of argumentInfo) {
		if (info.isStringLiteral) {
			if (!hasAddedNewStrings) {
				// Add all new string arguments at the position of the first original string argument
				while (newStringArgIndex < newStringArguments.length) {
					const arg = newStringArguments[newStringArgIndex];
					allArguments.push(`"${arg.replace(/"/g, '\\"')}"`);
					newStringArgIndex++;
				}
				hasAddedNewStrings = true;
			}
			// Skip remaining original string arguments (they've been replaced by the new ones above)
		} else {
			// Preserve non-string arguments (variables, expressions, etc.) in their original positions
			const argText = source.getText(info.node);
			allArguments.push(argText);
		}
	}

	// Handle edge case: more new string arguments than original (shouldn't happen, but be safe)
	if (!hasAddedNewStrings && newStringArguments.length > 0) {
		// If we somehow didn't add any strings (no string arguments in original), add them at the end
		for (const arg of newStringArguments) {
			allArguments.push(`"${arg.replace(/"/g, '\\"')}"`);
		}
	}

	// Check if any changes were made
	const originalStringArgs = argumentInfo
		.filter((info) => info.isStringLiteral && info.classString)
		.map((info) => info.classString!);

	// If no changes needed, return null
	if (
		newStringArguments.length === originalStringArgs.length &&
		newStringArguments.every((arg, i) => arg === originalStringArgs[i])
	) {
		return null;
	}

	// Generate the fix
	const start = node.arguments[0]?.range?.[0];
	const end = node.arguments[node.arguments.length - 1]?.range?.[1];

	if (start === undefined || end === undefined) {
		return null;
	}

	// Generate new code with all arguments (reorganized strings + preserved non-strings)
	const newCode = allArguments.join(", ");

	return {
		range: [start, end],
		text: newCode,
	};
}

/**
 * Generate a fix for JSX attribute by wrapping with class function
 *
 * This function:
 * 1. Checks if the class string needs wrapping (mixes base/modifiers or has multiple modifier groups)
 * 2. Processes classes into properly-grouped function arguments
 * 3. Wraps the result in JSX expression syntax: {functionName(...args)}
 * 4. Returns null if no fix is needed or if edge cases prevent fixing
 *
 * @param node - The JSXAttribute node
 * @param context - ESLint rule context
 * @param classString - The class string from the attribute
 * @param preferredFunction - The function name to use for wrapping
 * @returns Fix object or null if no fix needed
 */
export function generateJSXAttributeFix(
	node: JSXAttributeNode,
	context: Rule.RuleContext,
	classString: string,
	preferredFunction: string
): Rule.Fix | null {
	// Check if wrapping is needed
	const needsWrapping =
		mixesBaseAndModifiers(classString) ||
		hasMultipleModifierGroups(classString);

	if (!needsWrapping) {
		return null;
	}

	// Process classes into function arguments using shared utility
	const arguments_ = processClassesIntoArguments(classString);
	if (!arguments_) {
		return null;
	}

	const newCode = `${preferredFunction}(${arguments_.join(", ")})`;

	// ESLint's JSXAttribute type has value as optional, but it exists for className attributes
	// We use a type assertion to access it - Extract doesn't preserve the value property type
	const value = (node as unknown as { value?: JSXAttributeValue }).value;
	if (!value) {
		return null;
	}

	// Use type guard to safely extract range
	if (!hasValidRange(value)) {
		return null;
	}

	const [start, end] = value.range;

	return {
		range: [start, end],
		text: `{${newCode}}`,
	};
}

/**
 * Generate a fix for variant object property value
 * Wraps the value with class function if needed
 *
 * This function:
 * 1. Checks if the class string needs wrapping (mixes base/modifiers or has multiple modifier groups)
 * 2. Processes classes into properly-grouped function arguments
 * 3. Replaces the property value with the function call
 * 4. Returns null if no fix is needed or if edge cases prevent fixing
 *
 * @param node - The Property node (variant value)
 * @param context - ESLint rule context
 * @param classString - The class string from the property value
 * @param preferredFunction - The function name to use for wrapping
 * @returns Fix object or null if no fix needed
 */
export function generateVariantValueFix(
	node: PropertyNode,
	context: Rule.RuleContext,
	classString: string,
	preferredFunction: string
): Rule.Fix | null {
	// Check if wrapping is needed
	const needsWrapping =
		mixesBaseAndModifiers(classString) ||
		hasMultipleModifierGroups(classString);

	if (!needsWrapping) {
		return null;
	}

	// Process classes into function arguments using shared utility
	const arguments_ = processClassesIntoArguments(classString);
	if (!arguments_) {
		return null;
	}

	const newCode = `${preferredFunction}(${arguments_.join(", ")})`;

	const value = node.value;

	if (value.type !== "Literal" && value.type !== "TemplateLiteral") {
		return null;
	}

	if (!value.range) {
		return null;
	}

	const start = value.range[0];
	const end = value.range[1];

	return {
		range: [start, end],
		text: newCode,
	};
}

/**
 * Verify that a fix is non-destructive (all input classes appear in output)
 *
 * This function ensures that auto-fixes never add or remove classes, only reorganize them.
 * This is a core principle of the plugin as stated in the README.
 *
 * @param inputClasses - Array of input class strings
 * @param outputCode - The generated output code
 * @returns True if fix is non-destructive (all input classes in output, no extra classes)
 */
export function verifyFixNonDestructive(
	inputClasses: string[],
	outputCode: string
): boolean {
	// Extract all classes from input
	const inputClassSet = new Set<string>();
	for (const classString of inputClasses) {
		const parsed = parseClasses(classString);
		for (const p of parsed) {
			inputClassSet.add(p.full);
		}
	}

	// Extract all classes from output
	const outputClassSet = new Set<string>();
	// Simple extraction: find all class-like strings in the output
	// This is a simplified check - in practice, we'd parse the output more carefully
	const classPattern = /["']([^"']+)["']/g;
	let match;
	while ((match = classPattern.exec(outputCode)) !== null) {
		const classString = match[1];
		const parsed = parseClasses(classString);
		for (const p of parsed) {
			outputClassSet.add(p.full);
		}
	}

	// Check if all input classes are in output
	for (const className of inputClassSet) {
		if (!outputClassSet.has(className)) {
			return false;
		}
	}

	// Check if output doesn't have extra classes
	for (const className of outputClassSet) {
		if (!inputClassSet.has(className)) {
			return false;
		}
	}

	return true;
}

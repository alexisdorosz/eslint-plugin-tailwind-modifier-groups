import type { ParsedClass } from "../types/index.js";

/**
 * Parse a class string into individual classes and extract modifiers
 *
 * @param classString - The class string to parse (e.g., "hover:bg-red bg-blue")
 * @returns Array of parsed classes with modifier information
 */
export function parseClasses(classString: string): ParsedClass[] {
	if (!classString || !classString.trim()) {
		return [];
	}

	// Split by whitespace and filter out empty strings
	const classes = classString.trim().split(/\s+/).filter(Boolean);

	return classes.map((className) => parseClass(className));
}

/**
 * Parse a single class name to extract modifier and base
 *
 * @param className - The class name to parse (e.g., "hover:bg-red", "md:hover:text-white")
 * @returns Parsed class with modifier and base extracted
 */
export function parseClass(className: string): ParsedClass {
	if (!className) {
		return {
			full: "",
			modifier: null,
			base: "",
		};
	}

	// Find the rightmost colon (modifier ends with colon)
	const lastColonIndex = className.lastIndexOf(":");

	// No colon means it's a base class
	if (lastColonIndex === -1) {
		return {
			full: className,
			modifier: null,
			base: className,
		};
	}

	// Everything before and including the rightmost colon is the modifier
	const modifier = className.slice(0, lastColonIndex + 1);
	const base = className.slice(lastColonIndex + 1);

	return {
		full: className,
		modifier,
		base,
	};
}

/**
 * Extract the modifier from a class name
 *
 * @param className - The class name
 * @returns The modifier (everything before and including rightmost colon), or null for base classes
 */
export function extractModifier(className: string): string | null {
	const parsed = parseClass(className);
	return parsed.modifier;
}


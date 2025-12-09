import type { ModifierGroup, ParsedClass } from "../types/index.js";
import { parseClasses, parseClass } from "./class-parser.js";

/**
 * Group classes by their modifier
 *
 * @param classes - Array of class strings to group
 * @returns Map of modifier to classes array
 */
export function groupClassesByModifier(
	classes: string[],
): Map<string | null, string[]> {
	const groups = new Map<string | null, string[]>();

	for (const className of classes) {
		const parsed = parseClass(className);
		const modifier = parsed.modifier;

		if (!groups.has(modifier)) {
			groups.set(modifier, []);
		}

		const group = groups.get(modifier);
		if (group) {
			group.push(className);
		}
	}

	return groups;
}

/**
 * Group parsed classes into modifier groups
 *
 * @param parsedClasses - Array of parsed classes
 * @returns Array of modifier groups
 */
export function createModifierGroups(
	parsedClasses: ParsedClass[],
): ModifierGroup[] {
	const groups = new Map<string | null, string[]>();

	for (const parsed of parsedClasses) {
		const modifier = parsed.modifier;

		if (!groups.has(modifier)) {
			groups.set(modifier, []);
		}

		const group = groups.get(modifier);
		if (group) {
			group.push(parsed.full);
		}
	}

	return Array.from(groups.entries()).map(([modifier, classes]) => ({
		modifier,
		classes,
	}));
}

/**
 * Group classes from a class string into modifier groups
 *
 * @param classString - The class string to parse and group
 * @returns Array of modifier groups
 */
export function groupClassString(classString: string): ModifierGroup[] {
	const parsedClasses = parseClasses(classString);
	return createModifierGroups(parsedClasses);
}

/**
 * Check if a class string contains multiple modifier groups
 *
 * @param classString - The class string to check
 * @returns True if the string contains multiple modifier groups
 */
export function hasMultipleModifierGroups(classString: string): boolean {
	const groups = groupClassString(classString);
	return groups.length > 1;
}

/**
 * Check if a class string mixes base classes with modifier classes
 *
 * @param classString - The class string to check
 * @returns True if base and modifier classes are mixed
 */
export function mixesBaseAndModifiers(classString: string): boolean {
	const groups = groupClassString(classString);
	const hasBase = groups.some((g) => g.modifier === null);
	const hasModifiers = groups.some((g) => g.modifier !== null);
	return hasBase && hasModifiers;
}

/**
 * Check if classes with the same modifier are split across multiple strings
 *
 * @param classStrings - Array of class strings to check
 * @returns True if same modifier appears in multiple strings
 */
export function hasSplitModifiers(classStrings: string[]): boolean {
	const modifierToSources = new Map<string | null, Set<number>>();

	for (let i = 0; i < classStrings.length; i++) {
		const groups = groupClassString(classStrings[i]);
		for (const group of groups) {
			if (!modifierToSources.has(group.modifier)) {
				modifierToSources.set(group.modifier, new Set());
			}
			const sources = modifierToSources.get(group.modifier);
			if (sources) {
				sources.add(i);
			}
		}
	}

	// Check if any modifier appears in multiple sources
	for (const sources of modifierToSources.values()) {
		if (sources.size > 1) {
			return true;
		}
	}

	return false;
}

/**
 * Get the modifier that appears split across multiple strings
 *
 * @param classStrings - Array of class strings to check
 * @returns The modifier that is split, or null if none
 */
export function getSplitModifier(classStrings: string[]): string | null {
	const modifierToSources = new Map<string | null, Set<number>>();

	for (let i = 0; i < classStrings.length; i++) {
		const groups = groupClassString(classStrings[i]);
		for (const group of groups) {
			if (!modifierToSources.has(group.modifier)) {
				modifierToSources.set(group.modifier, new Set());
			}
			const sources = modifierToSources.get(group.modifier);
			if (sources) {
				sources.add(i);
			}
		}
	}

	// Find the first modifier that appears in multiple sources
	for (const [modifier, sources] of modifierToSources.entries()) {
		if (sources.size > 1 && modifier !== null) {
			return modifier;
		}
	}

	return null;
}

/**
 * Get the first two different modifiers from a class string
 *
 * @param classString - The class string to check
 * @returns Array of two modifier names, or null if less than two modifiers
 */
export function getFirstTwoModifiers(classString: string): [string, string] | null {
	const groups = groupClassString(classString);
	const modifiers = groups
		.filter((g) => g.modifier !== null)
		.map((g) => g.modifier!)
		.slice(0, 2);

	if (modifiers.length >= 2) {
		return [modifiers[0], modifiers[1]];
	}

	return null;
}

/**
 * Get the first modifier from a class string that has both base and modifier classes
 *
 * @param classString - The class string to check
 * @returns The first modifier found, or null
 */
export function getFirstModifier(classString: string): string | null {
	const groups = groupClassString(classString);
	const modifierGroup = groups.find((g) => g.modifier !== null);
	return modifierGroup?.modifier ?? null;
}


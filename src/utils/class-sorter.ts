import {
	ModifierPriority,
	MODIFIER_PATTERNS,
	KNOWN_VARIANT_ORDER,
} from "../constants/index.js";
import type { ModifierGroup } from "../types/index.js";
import { groupClassesByModifier } from "./class-grouper.js";

/**
 * Get the priority of a modifier
 *
 * @param modifier - The modifier string (e.g., "hover:", "md:hover:", null for base)
 * @returns The priority level
 */
export function getModifierPriority(modifier: string | null): ModifierPriority {
	if (modifier === null) {
		return ModifierPriority.BASE;
	}

	// Check for arbitrary variants first (they can contain colons)
	if (MODIFIER_PATTERNS.ARBITRARY.test(modifier)) {
		return ModifierPriority.ARBITRARY;
	}

	// Check for chained modifiers (responsive + pseudo-class)
	// e.g., "md:hover:", "lg:focus:"
	// Count colons to detect chaining (chained modifiers have more than one colon)
	const colonCount = (modifier.match(/:/g) || []).length;
	if (colonCount > 1) {
		// Split by colon and check each part
		const parts = modifier.split(":").filter(Boolean);
		let hasResponsive = false;
		let hasPseudoClass = false;

		for (const part of parts) {
			if (MODIFIER_PATTERNS.RESPONSIVE.test(part + ":")) {
				hasResponsive = true;
			}
			if (MODIFIER_PATTERNS.PSEUDO_CLASS.test(part + ":")) {
				hasPseudoClass = true;
			}
		}

		if (hasResponsive && hasPseudoClass) {
			return ModifierPriority.CHAINED;
		}
	}

	// Check for dark mode
	if (MODIFIER_PATTERNS.DARK.test(modifier)) {
		return ModifierPriority.DARK;
	}

	// Check for ARIA/Data variants
	if (MODIFIER_PATTERNS.ARIA.test(modifier) || MODIFIER_PATTERNS.DATA.test(modifier)) {
		return ModifierPriority.ARIA_DATA;
	}

	// Check for responsive variants
	const hasResponsive = MODIFIER_PATTERNS.RESPONSIVE.test(modifier);
	if (hasResponsive) {
		return ModifierPriority.RESPONSIVE;
	}

	// Check for group/peer variants
	if (MODIFIER_PATTERNS.GROUP_PEER.test(modifier)) {
		return ModifierPriority.PSEUDO_CLASS; // Group/peer variants are similar to pseudo-classes
	}

	// Check for has-* variants
	if (MODIFIER_PATTERNS.HAS.test(modifier)) {
		return ModifierPriority.PSEUDO_CLASS; // Has variants are similar to pseudo-classes
	}

	// Check for supports-* variants
	if (MODIFIER_PATTERNS.SUPPORTS.test(modifier)) {
		return ModifierPriority.PSEUDO_CLASS; // Supports variants are similar to pseudo-classes
	}

	// Check for pseudo-class variants
	const hasPseudoClass = MODIFIER_PATTERNS.PSEUDO_CLASS.test(modifier);
	if (hasPseudoClass) {
		return ModifierPriority.PSEUDO_CLASS;
	}

	// Unknown modifier
	return ModifierPriority.UNKNOWN;
}

/**
 * Get the sort order for a modifier within its priority level
 * Uses Tailwind's known variant order, falls back to alphabetical
 *
 * @param modifier - The modifier string
 * @returns Sort order (lower = earlier)
 */
export function getModifierSortOrder(modifier: string | null): number {
	if (modifier === null || modifier.length === 0) {
		return 0;
	}

	// Remove trailing colon for comparison
	const modifierWithoutColon = modifier.slice(0, -1);
	if (modifierWithoutColon.length === 0) {
		return 0;
	}

	// Check if it's in the known variant order
	const knownIndex = KNOWN_VARIANT_ORDER.indexOf(modifierWithoutColon);
	if (knownIndex !== -1) {
		return knownIndex;
	}

	// For chained modifiers, extract the first part
	if (modifier.includes(":")) {
		const firstPart = modifier.split(":")[0];
		const firstPartIndex = KNOWN_VARIANT_ORDER.indexOf(firstPart);
		if (firstPartIndex !== -1) {
			// Use the first part's order, then add a small offset for chaining
			return firstPartIndex + 1000;
		}
	}

	// For unknown modifiers, use alphabetical order
	// Convert to a number for sorting (simple hash)
	return 10000 + modifierWithoutColon.charCodeAt(0);
}

/**
 * Compare two modifiers for sorting
 *
 * @param a - First modifier
 * @param b - Second modifier
 * @returns Comparison result (-1, 0, or 1)
 */
export function compareModifiers(
	a: string | null,
	b: string | null,
): number {
	const priorityA = getModifierPriority(a);
	const priorityB = getModifierPriority(b);

	// First sort by priority
	if (priorityA !== priorityB) {
		return priorityA - priorityB;
	}

	// Within same priority, use sort order
	const orderA = getModifierSortOrder(a);
	const orderB = getModifierSortOrder(b);

	if (orderA !== orderB) {
		return orderA - orderB;
	}

	// If still equal, use alphabetical
	const strA = a ?? "";
	const strB = b ?? "";
	return strA.localeCompare(strB);
}

/**
 * Sort modifier groups by their modifier priority and order
 *
 * @param groups - Array of modifier groups to sort
 * @returns Sorted array of modifier groups
 */
export function sortModifierGroups(groups: ModifierGroup[]): ModifierGroup[] {
	return [...groups].sort((a, b) => compareModifiers(a.modifier, b.modifier));
}

/**
 * Sort classes within a modifier group (alphabetically for now)
 *
 * @param classes - Array of class names to sort
 * @returns Sorted array of class names
 */
export function sortClassesInGroup(classes: string[]): string[] {
	return [...classes].sort((a, b) => a.localeCompare(b));
}

/**
 * Sort and organize classes by modifier groups
 *
 * @param classes - Array of class names to sort
 * @returns Sorted array of modifier groups with sorted classes
 */
export function sortClassesByModifierGroups(classes: string[]): ModifierGroup[] {
	// Group classes by modifier using existing utility
	const groupsMap = groupClassesByModifier(classes);

	// Convert to array of groups and sort classes within each group
	const groups: ModifierGroup[] = Array.from(groupsMap.entries()).map(
		([modifier, classes]) => ({
			modifier,
			classes: sortClassesInGroup(classes),
		}),
	);

	// Sort groups by modifier
	return sortModifierGroups(groups);
}



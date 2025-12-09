/**
 * Priority levels for modifier groups (lower number = higher priority)
 */
export enum ModifierPriority {
	/** Base classes (no modifier) */
	BASE = 0,
	/** Pseudo-class variants (hover:, focus:, etc.) */
	PSEUDO_CLASS = 1,
	/** Responsive variants (sm:, md:, lg:, etc.) */
	RESPONSIVE = 2,
	/** Chained responsive + pseudo-class (md:hover:, etc.) */
	CHAINED = 3,
	/** Dark mode (dark:) */
	DARK = 4,
	/** ARIA/Data variants (aria-*:, data-*:) */
	ARIA_DATA = 5,
	/** Arbitrary variants ([&_svg]:, etc.) */
	ARBITRARY = 6,
	/** Unknown modifiers */
	UNKNOWN = 7,
}

/**
 * Known responsive breakpoints
 */
export const RESPONSIVE_BREAKPOINTS = [
	"sm",
	"md",
	"lg",
	"xl",
	"2xl",
] as const;

/**
 * Known pseudo-class variants in Tailwind's order
 * (focus comes before hover in Tailwind's official order)
 */
export const PSEUDO_CLASS_VARIANTS = [
	"focus",
	"focus-within",
	"focus-visible",
	"hover",
	"active",
	"visited",
	"target",
	"disabled",
	"enabled",
	"checked",
	"indeterminate",
	"default",
	"required",
	"optional",
	"placeholder-shown",
	"autofill",
	"read-only",
	"read-write",
	"empty",
	"only",
	"first",
	"last",
	"odd",
	"even",
] as const;

/**
 * Known group/peer variants for Tailwind's group and peer utilities
 */
export const GROUP_PEER_VARIANTS = [
	"group",
	"peer",
] as const;

/**
 * Known has-* variants for Tailwind's has() pseudo-class support
 */
export const HAS_VARIANTS = [
	"has",
] as const;

/**
 * Known supports-* variants for Tailwind's @supports support
 */
export const SUPPORTS_VARIANTS = [
	"supports",
] as const;

/**
 * Known variant order for sorting within the same priority
 * This represents Tailwind's official variant ordering
 */
export const KNOWN_VARIANT_ORDER: readonly string[] = [
	// Base classes (no modifier)
	"",
	// Pseudo-class variants
	...PSEUDO_CLASS_VARIANTS,
	// Group/Peer variants
	...GROUP_PEER_VARIANTS,
	// Has variants
	...HAS_VARIANTS,
	// Supports variants
	...SUPPORTS_VARIANTS,
	// Responsive variants
	...RESPONSIVE_BREAKPOINTS,
	// Dark mode
	"dark",
	// ARIA variants (common ones)
	"aria-checked",
	"aria-disabled",
	"aria-expanded",
	"aria-hidden",
	"aria-invalid",
	"aria-pressed",
	"aria-readonly",
	"aria-required",
	"aria-selected",
	// Data variants (common pattern)
	"data-",
] as const;

/**
 * Regex patterns for modifier detection
 */
export const MODIFIER_PATTERNS = {
	/** Matches arbitrary variants like [&_svg]: */
	ARBITRARY: /^\[.+\]:/,
	/** Matches aria-* variants */
	ARIA: /^aria-[a-z-]+:/,
	/** Matches data-* variants */
	DATA: /^data-[a-z-]+:/,
	/** Matches dark: variant */
	DARK: /^dark:/,
	/** Matches responsive breakpoints */
	RESPONSIVE: new RegExp(`^(${RESPONSIVE_BREAKPOINTS.join("|")}):`),
	/** Matches pseudo-class variants */
	PSEUDO_CLASS: new RegExp(`^(${PSEUDO_CLASS_VARIANTS.join("|")}):`),
	/** Matches group/peer variants (group-*, peer-*) */
	GROUP_PEER: new RegExp(`^(${GROUP_PEER_VARIANTS.join("|")})(-[a-z-]+)?:`),
	/** Matches has-* variants */
	HAS: /^has-([a-z-]+)?:/,
	/** Matches supports-* variants */
	SUPPORTS: /^supports-([a-z-]+)?:/,
} as const;


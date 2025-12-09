# eslint-plugin-tailwind-modifier-groups

An ESLint plugin that enforces proper grouping of Tailwind CSS classes by their modifiers, improving code readability and maintainability.

## Overview

This plugin helps organize Tailwind CSS classes by grouping them according to their modifiers (variants). Classes with the same modifier are grouped together, while classes with different modifiers are separated into distinct arguments. This makes it easier to understand which styles apply under which conditions.

### Why Use This Plugin?

-   **Improved Readability**: Classes are organized logically by their modifiers
-   **Better Maintainability**: Easier to find and modify styles for specific states
-   **Consistent Code Style**: Enforces a consistent pattern across your codebase
-   **Auto-fixing**: Automatically reorganizes classes to follow the rules
-   **Tailwind Integration**: Uses Tailwind CSS's official class ordering when available

## Installation

```bash
npm install --save-dev eslint-plugin-tailwind-modifier-groups
# or
pnpm add -D eslint-plugin-tailwind-modifier-groups
# or
yarn add -D eslint-plugin-tailwind-modifier-groups
```

## Configuration

### Basic Setup

Add the plugin to your ESLint configuration:

```javascript
// eslint.config.js (ESLint 9+)
import tailwindModifierGroups from "eslint-plugin-tailwind-modifier-groups";

export default [
	{
		plugins: {
			"tailwind-modifier-groups": tailwindModifierGroups,
		},
		rules: {
			"tailwind-modifier-groups/group-tailwind-modifiers": "error",
		},
	},
];
```

### With Custom Options

```javascript
// eslint.config.js
import tailwindModifierGroups from "eslint-plugin-tailwind-modifier-groups";

export default [
	{
		plugins: {
			"tailwind-modifier-groups": tailwindModifierGroups,
		},
		rules: {
			"tailwind-modifier-groups/group-tailwind-modifiers": [
				"error",
				{
					classFunctions: ["cn", "clsx", "cva", "tv", "classnames"],
					preferredFunction: "cn",
					classAttributes: ["className", "class"],
				},
			],
		},
	},
];
```

## Rules

### `group-tailwind-modifiers`

Enforces proper grouping of Tailwind CSS classes by modifiers.

#### Rule Options

-   **`classFunctions`** (array of strings, default: `['cn', 'clsx', 'cva', 'classnames']`)

    -   Function names to check for Tailwind classes
    -   Examples: `['cn', 'clsx', 'twMerge']`

-   **`preferredFunction`** (string, default: `'cn'`)

    -   Function name to use in auto-fixes
    -   This function will be used when wrapping complex class strings

-   **`classAttributes`** (array of strings, default: `['className']`)

    -   JSX attribute names to check for Tailwind classes
    -   Examples: `['className', 'class']` for React and Vue

## Examples

### ✅ Valid Examples

#### Standard Function Calls

```javascript
// ✅ Good: Classes grouped by modifier
cn("bg-blue-500", "hover:bg-blue-600 hover:text-white", "focus:ring-2");

// ✅ Good: Base classes separate from modifiers
cn("p-4 rounded-lg", "hover:bg-gray-100", "dark:bg-gray-800");
```

#### JSX Attributes

```jsx
// ✅ Good: Simple class string (no mixing)
<div className="bg-blue-500 text-white p-4" />

// ✅ Good: Wrapped with class function when needed
<div className={cn("bg-blue-500", "hover:bg-blue-600")} />
```

#### Variant-Based Functions (cva)

```javascript
// ✅ Good: Base and variants properly separated
const button = cva("px-4 py-2 rounded", {
	variants: {
		variant: {
			primary: "bg-blue-500 text-white",
			secondary: "bg-gray-200 text-gray-800",
		},
		size: {
			sm: "text-sm",
			lg: "text-lg",
		},
	},
});
```

#### Variant-Based Functions (tailwind-variants)

```javascript
// ✅ Good: Base and variants properly separated
const button = tv({
	base: "px-4 py-2 rounded",
	variants: {
		variant: {
			primary: "bg-blue-500 text-white",
			secondary: "bg-gray-200 text-gray-800",
		},
	},
});
```

### ❌ Invalid Examples

#### Split Modifiers

```javascript
// ❌ Bad: Same modifier split across arguments
cn("hover:bg-red-500", "hover:text-white", "bg-blue-500");

// ✅ Fixed: Modifiers grouped together
cn("bg-blue-500", "hover:bg-red-500 hover:text-white");
```

#### Mixed Base and Modifiers

```javascript
// ❌ Bad: Base classes mixed with modifier classes
cn("bg-blue-500 hover:text-white");

// ✅ Fixed: Separated into distinct arguments
cn("bg-blue-500", "hover:text-white");
```

#### Multiple Modifier Groups

```javascript
// ❌ Bad: Multiple modifier groups in one string
cn("hover:bg-red-500 focus:ring-2");

// ✅ Fixed: Separated into distinct arguments
cn("hover:bg-red-500", "focus:ring-2");
```

#### Complex JSX Attributes

```jsx
// ❌ Bad: Mixed base and modifiers in JSX
<div className="bg-blue-500 hover:text-white" />

// ✅ Fixed: Wrapped with class function
<div className={cn("bg-blue-500", "hover:text-white")} />
```

## Auto-fixing

The plugin automatically fixes violations when possible. Run ESLint with the `--fix` flag:

```bash
npx eslint . --fix
```

### What Gets Fixed

1. **Split Modifiers**: Merges classes with the same modifier into a single argument
2. **Multiple Modifier Groups**: Splits classes with different modifiers into separate arguments
3. **Mixed Base and Modifiers**: Separates base classes from modifier classes
4. **Complex JSX Attributes**: Wraps complex class strings with the preferred function

## Tailwind CSS Integration

When Tailwind CSS is installed and configured, the plugin uses Tailwind's official class ordering API to sort classes. This ensures:

-   **Accuracy**: Always matches Tailwind's official order
-   **Maintainability**: Automatically adapts to Tailwind updates
-   **Consistency**: Works with custom Tailwind configurations

### How It Works

1. The plugin detects if Tailwind CSS is installed
2. If available, it loads your Tailwind configuration
3. Uses Tailwind's `getClassOrder()` to get official sort order
4. Extracts variant information using Tailwind's parsing API
5. Sorts classes according to Tailwind's deterministic order

### Fallback Behavior

If Tailwind CSS is not available, the plugin uses a priority-based fallback system:

1. **Base classes** (no modifier) → Priority 0
2. **Pseudo-class variants** (`hover:`, `focus:`, etc.) → Priority 1
3. **Responsive variants** (`sm:`, `md:`, `lg:`, etc.) → Priority 2
4. **Chained variants** (`md:hover:`, etc.) → Priority 3
5. **Dark mode** (`dark:`) → Priority 4
6. **ARIA/Data variants** (`aria-*:`, `data-*:`) → Priority 5
7. **Arbitrary variants** (`[&_svg]:`, etc.) → Priority 6
8. **Unknown modifiers** → Priority 7

## Supported Libraries

The plugin works with various class utility libraries:

-   **`clsx`** - Conditional class names
-   **`classnames`** - Class name utility
-   **`cva`** (class-variance-authority) - Variant-based styling
-   **`tv`** (tailwind-variants) - Type-safe variants
-   **Custom functions** - Any function you configure

## Modifier Definition

A modifier is defined as **everything before and including the rightmost colon (`:`) in a class name**.

Examples:

-   `hover:bg-red-500` → modifier: `hover:`, base: `bg-red-500`
-   `md:hover:text-white` → modifier: `md:hover:`, base: `text-white`
-   `bg-blue-500` → modifier: `null` (base class), base: `bg-blue-500`

## Group Ordering

When multiple modifier groups are present, they are ordered according to Tailwind CSS's deterministic class order:

```
base classes → focus: → hover: → md: → lg: → dark: → aria-invalid:
```

The exact order follows Tailwind CSS's official variant ordering. When Tailwind is available, the plugin uses Tailwind's API to determine the correct order.

## Philosophy

This plugin follows two core principles:

1. **Non-destructive**: Auto-fixes never add or remove classes, only reorganize them
2. **Opinionated Separation**: Base classes and modifier classes are always separated

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

import type {
	FunctionPattern,
	CallExpressionNode,
	ObjectExpressionNode,
} from "../types/index.js";

/**
 * Detect function call pattern from AST structure (not function name)
 *
 * Patterns detected:
 * - cva-like: fn(string/array, { variants: {... }}) - base in first arg, variants in second arg
 * - tv-like: fn({ base: string/array, variants: {... }}) - base and variants in first arg object
 * - standard: fn(...strings) - all args are class strings
 *
 * @param node - The CallExpression node
 * @returns Detected function pattern
 */
export function detectFunctionPattern(
	node: CallExpressionNode,
): FunctionPattern {
	// Pattern 1: Check for cva-like pattern
	// fn(string/array, { variants: {... }})
	if (node.arguments.length >= 2) {
		const firstArg = node.arguments[0];
		const secondArg = node.arguments[1];

		// First arg should be string, template literal, or array
		const isFirstArgValid =
			firstArg.type === "Literal" ||
			firstArg.type === "TemplateLiteral" ||
			firstArg.type === "ArrayExpression";

		// Second arg should be an object with 'variants' property
		if (
			isFirstArgValid &&
			secondArg.type === "ObjectExpression" &&
			hasProperty(secondArg as ObjectExpressionNode, "variants")
		) {
			return {
				type: "cva-like",
				baseLocation: {
					type: "argument",
					argumentIndex: 0,
				},
				variantsLocation: {
					type: "property",
					argumentIndex: 1,
					propertyName: "variants",
				},
			};
		}
	}

	// Pattern 2: Check for tv-like pattern
	// fn({ base: string/array, variants: {... }})
	if (node.arguments.length >= 1) {
		const firstArg = node.arguments[0];

		if (firstArg.type === "ObjectExpression") {
			const hasBase = hasProperty(firstArg as ObjectExpressionNode, "base");
			const hasVariants = hasProperty(firstArg as ObjectExpressionNode, "variants");

			if (hasBase && hasVariants) {
				return {
					type: "tv-like",
					baseLocation: {
						type: "property",
						argumentIndex: 0,
						propertyName: "base",
					},
					variantsLocation: {
						type: "property",
						argumentIndex: 0,
						propertyName: "variants",
					},
				};
			}
		}
	}

	// Pattern 3: Default to standard pattern
	// fn(...strings)
	return {
		type: "standard",
	};
}

/**
 * Check if an ObjectExpression has a specific property
 *
 * @param obj - The ObjectExpression node to check
 * @param propertyName - The name of the property to look for
 * @returns True if the object has a property with the given name
 */
function hasProperty(
	obj: ObjectExpressionNode,
	propertyName: string,
): boolean {
	return obj.properties.some((prop) => {
		if (prop.type !== "Property" || prop.key.type !== "Identifier") {
			return false;
		}
		return prop.key.name === propertyName;
	});
}


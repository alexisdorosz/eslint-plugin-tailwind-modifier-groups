import type { Rule } from "eslint";
import type {
	FunctionPattern,
	CallExpressionNode,
	JSXAttributeNode,
	PropertyNode,
	ObjectExpressionNode,
	LiteralNode,
} from "../types/index.js";

/**
 * Extract string literals from function call arguments
 *
 * @param node - The CallExpression node
 * @param context - ESLint rule context
 * @returns Array of class strings from string literal arguments
 */
export function extractStringArguments(
	node: CallExpressionNode,
	context: Rule.RuleContext
): string[] {
	const classStrings: string[] = [];

	for (const arg of node.arguments) {
		// Handle string literals
		if (arg.type === "Literal" && typeof arg.value === "string") {
			classStrings.push(arg.value);
		}
		// Handle template literals without expressions
		else if (arg.type === "TemplateLiteral") {
			// Only process if there are no expressions
			if (arg.expressions.length === 0) {
				// Get the raw template literal value
				const source = context.getSourceCode();
				const text = source.getText(arg);
				// Remove backticks and extract content
				const content = text.slice(1, -1);
				classStrings.push(content);
			}
			// Skip template literals with expressions (too complex)
		}
		// Skip other argument types (arrays, objects, variables, etc.)
	}

	return classStrings;
}

/**
 * Information about an argument in a function call
 */
export interface ArgumentInfo {
	/** The argument index in the original call */
	index: number;
	/** Whether this is a string literal we can process */
	isStringLiteral: boolean;
	/** The class string if it's a string literal, null otherwise */
	classString: string | null;
	/** The original argument node */
	node: Rule.Node;
}

/**
 * Extract information about all arguments, identifying which are string literals
 * This is used to preserve non-string arguments (variables, expressions, etc.) during fixes
 *
 * @param node - The CallExpression node
 * @param context - ESLint rule context
 * @returns Array of argument information with indices and types
 */
export function extractArgumentInfo(
	node: CallExpressionNode,
	context: Rule.RuleContext
): ArgumentInfo[] {
	const argumentInfo: ArgumentInfo[] = [];

	for (let i = 0; i < node.arguments.length; i++) {
		const arg = node.arguments[i];
		let isStringLiteral = false;
		let classString: string | null = null;

		// Handle string literals
		if (arg.type === "Literal" && typeof arg.value === "string") {
			isStringLiteral = true;
			classString = arg.value;
		}
		// Handle template literals without expressions
		else if (
			arg.type === "TemplateLiteral" &&
			arg.expressions.length === 0
		) {
			isStringLiteral = true;
			const source = context.getSourceCode();
			const text = source.getText(arg);
			classString = text.slice(1, -1); // Remove backticks
		}
		// Other argument types (variables, expressions, etc.) are not string literals

		argumentInfo.push({
			index: i,
			isStringLiteral,
			classString,
			node: arg as Rule.Node,
		});
	}

	return argumentInfo;
}

/**
 * Extract class string from a JSX attribute
 *
 * @param node - The JSXAttribute node
 * @param context - ESLint rule context
 * @returns The class string, or null if not a string literal
 */
export function extractJSXAttributeValue(
	node: JSXAttributeNode,
	context: Rule.RuleContext
): string | null {
	// ESLint's JSXAttribute type has value as optional, but it exists for className attributes
	// We use a type assertion to access it - Extract doesn't preserve the value property type
	const value = (
		node as unknown as {
			value?:
				| { type: "JSXExpressionContainer"; expression: Rule.Node }
				| { type: "Literal"; value: unknown };
		}
	).value;
	if (!value) {
		return null;
	}

	// Handle JSXExpressionContainer with string literal
	if (value.type === "JSXExpressionContainer") {
		const expression = value.expression;

		// String literal
		if (
			expression.type === "Literal" &&
			typeof expression.value === "string"
		) {
			return expression.value;
		}

		// Template literal without expressions
		if (
			expression.type === "TemplateLiteral" &&
			expression.expressions.length === 0
		) {
			const source = context.getSourceCode();
			const text = source.getText(expression);
			const content = text.slice(1, -1); // Remove backticks
			return content;
		}

		// Skip other expression types (function calls, variables, etc.)
		return null;
	}

	// Handle JSX string literal (rare, but possible)
	if (value.type === "Literal" && typeof value.value === "string") {
		return value.value;
	}

	return null;
}

/**
 * Extract base classes from function call based on pattern
 *
 * @param node - The CallExpression node
 * @param context - ESLint rule context
 * @param pattern - The detected function pattern
 * @returns The base class string, or null
 */
export function extractBaseClasses(
	node: CallExpressionNode,
	context: Rule.RuleContext,
	pattern: FunctionPattern
): string | null {
	if (!pattern.baseLocation) {
		return null;
	}

	const { argumentIndex, type, propertyName } = pattern.baseLocation;

	if (node.arguments.length <= argumentIndex) {
		return null;
	}

	const arg = node.arguments[argumentIndex];

	if (type === "argument") {
		// Base is directly in the argument
		if (arg.type === "Literal" && typeof arg.value === "string") {
			return arg.value;
		}

		// Handle template literal
		if (arg.type === "TemplateLiteral" && arg.expressions.length === 0) {
			const source = context.getSourceCode();
			const text = source.getText(arg);
			return text.slice(1, -1); // Remove backticks
		}

		// Handle array of strings
		if (arg.type === "ArrayExpression") {
			const elements = arg.elements
				.filter(
					(el): el is LiteralNode =>
						el?.type === "Literal" && typeof el.value === "string"
				)
				.map((el) => el.value);
			return elements.join(" ");
		}
	} else if (type === "property" && propertyName) {
		// Base is in a property of the argument object
		if (arg.type !== "ObjectExpression") {
			return null;
		}

		// Find the property
		for (const prop of arg.properties) {
			if (
				prop.type === "Property" &&
				prop.key.type === "Identifier" &&
				prop.key.name === propertyName
			) {
				const value = prop.value;

				if (
					value.type === "Literal" &&
					typeof value.value === "string"
				) {
					return value.value;
				}

				// Handle template literal
				if (
					value.type === "TemplateLiteral" &&
					value.expressions.length === 0
				) {
					const source = context.getSourceCode();
					const text = source.getText(value);
					return text.slice(1, -1); // Remove backticks
				}

				// Handle array of strings
				if (value.type === "ArrayExpression") {
					const elements = value.elements
						.filter(
							(el): el is LiteralNode =>
								el?.type === "Literal" &&
								typeof el.value === "string"
						)
						.map((el) => el.value);
					return elements.join(" ");
				}
			}
		}
	}

	return null;
}

/**
 * Extract variant object property values from function call based on pattern
 *
 * @param node - The CallExpression node
 * @param context - ESLint rule context
 * @param pattern - The detected function pattern
 * @returns Map of property paths to class strings
 */
export function extractVariantValues(
	node: CallExpressionNode,
	context: Rule.RuleContext,
	pattern: FunctionPattern
): Map<string, string> {
	const variantValues = new Map<string, string>();

	if (!pattern.variantsLocation) {
		return variantValues;
	}

	const { argumentIndex, propertyName } = pattern.variantsLocation;

	if (node.arguments.length <= argumentIndex) {
		return variantValues;
	}

	const arg = node.arguments[argumentIndex];

	if (arg.type !== "ObjectExpression") {
		return variantValues;
	}

	// Find 'variants' property
	for (const prop of arg.properties) {
		if (
			prop.type === "Property" &&
			prop.key.type === "Identifier" &&
			prop.key.name === propertyName &&
			prop.value.type === "ObjectExpression"
		) {
			extractVariantObject(
				prop.value as ObjectExpressionNode,
				context,
				variantValues,
				""
			);
		}
	}

	return variantValues;
}

/**
 * Find the AST node for the base property/value based on pattern
 *
 * @param node - The CallExpression node
 * @param context - ESLint rule context
 * @param pattern - The detected function pattern
 * @returns The Property or Expression node for the base, or null
 */
export function findBaseNode(
	node: CallExpressionNode,
	context: Rule.RuleContext,
	pattern: FunctionPattern
): PropertyNode | Extract<Rule.Node, { type: "Expression" }> | null {
	if (!pattern.baseLocation) {
		return null;
	}

	const { argumentIndex, type, propertyName } = pattern.baseLocation;

	if (node.arguments.length <= argumentIndex) {
		return null;
	}

	const arg = node.arguments[argumentIndex];

	if (type === "argument") {
		// Base is directly in the argument
		// For argument type, we return the argument itself (Expression)
		return arg as Extract<Rule.Node, { type: "Expression" }>;
	} else if (type === "property" && propertyName) {
		// Base is in a property of the argument object
		if (arg.type !== "ObjectExpression") {
			return null;
		}

		// Find the property
		for (const prop of arg.properties) {
			if (
				prop.type === "Property" &&
				prop.key.type === "Identifier" &&
				prop.key.name === propertyName
			) {
				return prop as PropertyNode;
			}
		}
	}

	return null;
}

/**
 * Find the AST node for a specific variant property value
 *
 * @param node - The CallExpression node
 * @param context - ESLint rule context
 * @param path - The path to the variant property (e.g., "size.sm")
 * @param pattern - The detected function pattern
 * @returns The Property node for the variant value, or null
 */
export function findVariantPropertyNode(
	node: CallExpressionNode,
	context: Rule.RuleContext,
	path: string,
	pattern: FunctionPattern
): PropertyNode | null {
	if (!pattern.variantsLocation) {
		return null;
	}

	const { argumentIndex, propertyName } = pattern.variantsLocation;

	if (node.arguments.length <= argumentIndex) {
		return null;
	}

	const arg = node.arguments[argumentIndex];

	if (arg.type !== "ObjectExpression") {
		return null;
	}

	// Find 'variants' property
	let variantsObject: ObjectExpressionNode | null = null;
	for (const prop of arg.properties) {
		if (
			prop.type === "Property" &&
			prop.key.type === "Identifier" &&
			prop.key.name === propertyName &&
			prop.value.type === "ObjectExpression"
		) {
			variantsObject = prop.value as ObjectExpressionNode;
			break;
		}
	}

	if (!variantsObject) {
		return null;
	}

	// Navigate to the specific variant property
	const [variantName, subVariantName] = path.split(".");

	const variantProperty = variantsObject.properties.find(
		(prop) =>
			prop.type === "Property" &&
			prop.key.type === "Identifier" &&
			prop.key.name === variantName
	) as PropertyNode | undefined;

	if (variantProperty?.value.type === "ObjectExpression") {
		const subVariantProperty = variantProperty.value.properties.find(
			(prop) =>
				prop.type === "Property" &&
				prop.key.type === "Identifier" &&
				prop.key.name === subVariantName
		) as PropertyNode | undefined;
		return subVariantProperty || null;
	}

	return null;
}

/**
 * Recursively extract variant object values
 *
 * @param obj - The ObjectExpression node
 * @param context - ESLint rule context
 * @param variantValues - Map to store results
 * @param path - Current property path (for nested objects)
 */
function extractVariantObject(
	obj: ObjectExpressionNode,
	context: Rule.RuleContext,
	variantValues: Map<string, string>,
	path: string
): void {
	for (const prop of obj.properties) {
		if (prop.type !== "Property") {
			continue;
		}

		const key =
			prop.key.type === "Identifier"
				? prop.key.name
				: prop.key.type === "Literal" &&
				  typeof prop.key.value === "string"
				? prop.key.value
				: null;

		if (!key) {
			continue;
		}

		const currentPath = path ? `${path}.${key}` : key;

		// If value is an object, recurse
		if (prop.value.type === "ObjectExpression") {
			extractVariantObject(
				prop.value as ObjectExpressionNode,
				context,
				variantValues,
				currentPath
			);
		}
		// If value is a string literal, store it
		else if (
			prop.value.type === "Literal" &&
			typeof prop.value.value === "string"
		) {
			variantValues.set(currentPath, prop.value.value);
		}
		// Handle template literal
		else if (
			prop.value.type === "TemplateLiteral" &&
			prop.value.expressions.length === 0
		) {
			const source = context.getSourceCode();
			const text = source.getText(prop.value);
			variantValues.set(currentPath, text.slice(1, -1)); // Remove backticks
		}
	}
}

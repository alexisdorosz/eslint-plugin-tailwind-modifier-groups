import type { Rule } from "eslint";

export interface ParsedClass {
	full: string;
	modifier: string | null;
	base: string;
}

export interface ModifierGroup {
	modifier: string | null;
	classes: string[];
}

/**
 * Function call pattern detected from AST structure
 */
export interface FunctionPattern {
	/** Pattern type based on AST structure */
	type: "standard" | "cva-like" | "tv-like";
	/** Location of base classes (if applicable) */
	baseLocation?: {
		type: "argument" | "property";
		argumentIndex: number;
		propertyName?: string; // For property-based (tv-like)
	};
	/** Location of variants object (if applicable) */
	variantsLocation?: {
		type: "argument" | "property";
		argumentIndex: number;
		propertyName: string; // Always "variants"
	};
}

export interface RuleOptions {
	classFunctions: string[];
	preferredFunction: string;
	classAttributes: string[];
}

export const DEFAULT_OPTIONS: RuleOptions = {
	classFunctions: ["cn"],
	preferredFunction: "cn",
	classAttributes: ["className"],
};

export type NodeWithParent = Rule.Node & { parent?: Rule.Node };

// Type aliases for specific ESLint node types
export type CallExpressionNode = Extract<Rule.Node, { type: "CallExpression" }>;
// JSXAttribute type - Extract from ESLint's node types
// Note: ESLint's JSXAttribute has value as optional, but it exists for className attributes
export type JSXAttributeNode = Extract<Rule.Node, { type: "JSXAttribute" }>;
export type PropertyNode = Extract<Rule.Node, { type: "Property" }>;
export type ObjectExpressionNode = Extract<
	Rule.Node,
	{ type: "ObjectExpression" }
>;
export type LiteralNode = Extract<Rule.Node, { type: "Literal" }>;

// Union type for nodes that can contain class names
export type ClassNameNode =
	| CallExpressionNode
	| JSXAttributeNode
	| PropertyNode
	| LiteralNode;

/**
 * Type guard to check if a JSXAttribute node has a JSXIdentifier name
 * Note: ESLint's Rule.Node type doesn't properly include JSXAttribute in the union,
 * so we use a runtime check with type assertions
 *
 * @param node - The node to check (from ESLint rule listener)
 * @returns True if the node is a JSXAttribute with a JSXIdentifier name
 */
export function isJSXAttributeWithIdentifier(node: unknown): node is {
	type: "JSXAttribute";
	name: { type: "JSXIdentifier"; name: string };
	value?: { type?: string; range?: [number, number] } | undefined;
} {
	if (typeof node !== "object" || node === null) {
		return false;
	}
	const obj = node as Record<string, unknown>;
	if (obj.type !== "JSXAttribute") {
		return false;
	}
	const name = obj.name;
	return (
		typeof name === "object" &&
		name !== null &&
		"type" in name &&
		name.type === "JSXIdentifier" &&
		"name" in name &&
		typeof name.name === "string"
	);
}

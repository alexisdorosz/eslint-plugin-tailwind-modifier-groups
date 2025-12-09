import type { Rule } from "eslint";

export const noHello: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow the string 'hello' in string literals",
		},
		schema: [],
		messages: {
			noHello: "Unexpected 'hello' in string literal.",
		},
	},
	create(context) {
		return {
			Literal(node) {
				if (typeof node.value === "string" && node.value.includes("hello")) {
					context.report({
						node,
						messageId: "noHello",
					});
				}
			},
		};
	},
};


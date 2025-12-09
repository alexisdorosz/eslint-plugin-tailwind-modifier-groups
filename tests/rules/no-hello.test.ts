import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import { noHello } from "../../src/rules/no-hello.js";

const ruleTester = new RuleTester({
	languageOptions: {
		ecmaVersion: 2022,
		sourceType: "module",
	},
});

describe("no-hello", () => {
	it("should pass valid code", () => {
		ruleTester.run("no-hello", noHello, {
			valid: [
				"const greeting = 'hi';",
				"const greeting = 'world';",
				"const greeting = '';",
				"const num = 42;",
				"const bool = true;",
				"const greeting = 'Hello';", // case-sensitive, so 'Hello' is allowed
			],
			invalid: [],
		});
	});

	it("should fail on strings containing 'hello'", () => {
		ruleTester.run("no-hello", noHello, {
			valid: [],
			invalid: [
				{
					code: "const greeting = 'hello';",
					errors: [
						{
							messageId: "noHello",
						},
					],
				},
				{
					code: "const greeting = 'say hello to me';",
					errors: [
						{
							messageId: "noHello",
						},
					],
				},
				{
					code: "const greeting = 'hello world';",
					errors: [
						{
							messageId: "noHello",
						},
					],
				},
			],
		});
	});
});


import { describe, it, expect } from "vitest";
// Note: AST traverser functions are tested indirectly through rule tests
// as they require complex AST setup with RuleTester

describe("ast-traverser", () => {
	it("should be tested through rule integration tests", () => {
		// These functions are tested in tests/rules/group-tailwind-modifiers.test.ts
		expect(true).toBe(true);
	});
});

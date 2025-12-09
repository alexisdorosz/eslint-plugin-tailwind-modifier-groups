import { describe, it, expect } from "vitest";
import { isClassFunction } from "../../src/utils/function-detector.js";

describe("function-detector", () => {
	describe("isClassFunction", () => {
		it("should return true for configured function names", () => {
			const classFunctions = ["cn", "clsx", "cva", "classnames"];
			expect(isClassFunction("cn", classFunctions)).toBe(true);
			expect(isClassFunction("clsx", classFunctions)).toBe(true);
			expect(isClassFunction("cva", classFunctions)).toBe(true);
		});

		it("should return false for unconfigured function names", () => {
			const classFunctions = ["cn", "clsx"];
			expect(isClassFunction("tv", classFunctions)).toBe(false);
			expect(isClassFunction("unknown", classFunctions)).toBe(false);
		});
	});
});

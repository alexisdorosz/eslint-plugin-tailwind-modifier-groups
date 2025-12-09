import { expect, test } from "vitest";
import plugin from "../src/index.js";

test("plugin exports correctly", () => {
	expect(plugin).toBeDefined();
	expect(plugin.meta).toBeDefined();
	expect(plugin.meta.name).toBe("eslint-plugin-tailwind-modifier-groups");
	expect(plugin.rules).toBeDefined();
	expect(plugin.rules["group-tailwind-modifiers"]).toBeDefined();
});

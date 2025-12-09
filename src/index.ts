import { readFileSync } from "fs";
import type { ESLint } from "eslint";

import { groupTailwindModifiers } from "./rules/group-tailwind-modifiers.js";

const pkg = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf-8")
);

const plugin: ESLint.Plugin = {
	meta: {
		name: pkg.name,
		version: pkg.version,
		namespace: "tailwind-modifier-groups",
	},
	rules: {
		"group-tailwind-modifiers": groupTailwindModifiers,
	},
};

export default plugin;

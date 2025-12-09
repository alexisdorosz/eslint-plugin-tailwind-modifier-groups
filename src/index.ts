import { readFileSync } from "fs";
import type { ESLint } from "eslint";

import { noHello } from "./rules/no-hello.js";

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
		"no-hello": noHello,
	},
};

export default plugin;

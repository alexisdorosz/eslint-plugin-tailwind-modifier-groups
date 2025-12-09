/**
 * Check if a function name matches the configured class functions
 *
 * @param functionName - The function name to check
 * @param classFunctions - Array of configured class function names
 * @returns True if the function name matches
 */
export function isClassFunction(
	functionName: string,
	classFunctions: string[],
): boolean {
	return classFunctions.includes(functionName);
}


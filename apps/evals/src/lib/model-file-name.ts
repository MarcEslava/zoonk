/**
 * Model ids embed the provider with `/` and the reasoning level with `:`. Both
 * characters are illegal in Windows file names, so saved results must collapse
 * them into one slug for the repository to check out on every platform.
 */
export function getModelFileName(modelId: string): string {
  return `${modelId.replaceAll(/[/:]/gu, "-")}.json`;
}

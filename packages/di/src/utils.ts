export const mergeDefaults = <T>(
  defaults: T,
  overrides: Partial<T> | undefined
): T => {
  if (!overrides) {
    return defaults
  }

  return { ...defaults, ...overrides }
}

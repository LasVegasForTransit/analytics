export function matches(pattern: RegExp, value: string) {
  pattern.lastIndex = 0;
  const result = pattern.test(value);
  pattern.lastIndex = 0;
  return result;
}

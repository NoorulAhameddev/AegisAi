export function enforceTokenLimit(text: string, max = 8000) {
  if (text.length > max) {
    return text.slice(-max);
  }
  return text;
}

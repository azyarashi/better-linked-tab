export function generateSentenceDelimiterRegex(delimiterList: string): RegExp {
  const chars = Array.from(delimiterList).filter((d) => 0 < d.trim().length);
  if (chars.length === 0) throw new Error('Better Linked Tab: Delimiter cannot be empty');

  const escapedChars = chars.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');

  const pattern = `(?<=[${escapedChars}]+)(?![${escapedChars}])`;
  return new RegExp(pattern, 'g');
}

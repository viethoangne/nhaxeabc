// Search utility functions
export function normalizeSearchTerm(term: string): string {
  return term
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}

export function filterSuggestions(
  query: string,
  suggestions: string[],
  limit: number = 8
): string[] {
  if (!query) return suggestions.slice(0, limit);
  
  const normalizedQuery = normalizeSearchTerm(query);
  
  return suggestions
    .filter(suggestion => {
      const normalizedSuggestion = normalizeSearchTerm(suggestion);
      return normalizedSuggestion.includes(normalizedQuery);
    })
    .slice(0, limit);
}

export function mergeAndDeduplicate(arrays: string[][]): string[] {
  const merged = arrays.flat();
  return Array.from(new Set(merged));
}

export const POPULAR_FROM = [
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Lạt',
  'Nha Trang',
  'Cần Thơ',
  'Đà Nẵng',
  'Vũng Tàu',
];

export const POPULAR_TO = [
  'Đà Lạt',
  'Nha Trang',
  'Phan Thiết',
  'Đà Nẵng',
  'Cần Thơ',
  'TP. Hồ Chí Minh',
  'Hà Nội',
];
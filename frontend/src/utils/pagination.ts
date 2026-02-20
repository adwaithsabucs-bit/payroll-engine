/**
 * Safely extract an array from a DRF response.
 *
 * DRF can return either:
 *   - Paginated: { count: N, results: [...] }
 *   - Plain array: [...]
 *
 * The old pattern `data.results || data` breaks when results is an empty
 * array [] because [] is falsy-ish in an || chain — the fallback activates
 * and sets state to the whole response object instead of an empty array.
 */
export function extractResults<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}
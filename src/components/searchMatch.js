/**
 * True when every word in `query` appears somewhere in the item's text, in any
 * order: "qwen 27" matches "qwen3.8 27b", "rtx 4090" matches "RTX 4090".
 */
export function matchesQuery(item, query) {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const text = `${item.name} ${item.detail ?? ''} ${item.badge ?? ''} ${item.haystack ?? ''}`.toLowerCase();
    return words.every((w) => text.includes(w));
}

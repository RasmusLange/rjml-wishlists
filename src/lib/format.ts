// "https://www.elgiganten.dk/..." → "elgiganten.dk", used when no shop is given.
export function shopFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Font catalog and dynamic loading for npng canvas rendering.
 * Loads Google Fonts on demand via <link> injection.
 */

export interface FontEntry {
  family: string;
  category: "sans-serif" | "serif" | "display" | "handwriting" | "monospace";
  weights: number[];
}

export const FONT_CATALOG: FontEntry[] = [
  // Sans-serif
  { family: "Inter", category: "sans-serif", weights: [400, 500, 600, 700] },
  { family: "Roboto", category: "sans-serif", weights: [400, 500, 700] },
  { family: "Open Sans", category: "sans-serif", weights: [400, 600, 700] },
  { family: "Montserrat", category: "sans-serif", weights: [400, 500, 600, 700] },
  { family: "Poppins", category: "sans-serif", weights: [400, 500, 600, 700] },
  { family: "Lato", category: "sans-serif", weights: [400, 700] },
  { family: "Nunito", category: "sans-serif", weights: [400, 600, 700] },
  { family: "Raleway", category: "sans-serif", weights: [400, 500, 600, 700] },
  { family: "DM Sans", category: "sans-serif", weights: [400, 500, 700] },
  { family: "Work Sans", category: "sans-serif", weights: [400, 500, 600, 700] },

  // Serif
  { family: "Playfair Display", category: "serif", weights: [400, 700] },
  { family: "Merriweather", category: "serif", weights: [400, 700] },
  { family: "Lora", category: "serif", weights: [400, 500, 700] },
  { family: "PT Serif", category: "serif", weights: [400, 700] },
  { family: "Cormorant Garamond", category: "serif", weights: [400, 500, 600, 700] },
  { family: "EB Garamond", category: "serif", weights: [400, 500, 700] },

  // Display
  { family: "Bebas Neue", category: "display", weights: [400] },
  { family: "Oswald", category: "display", weights: [400, 500, 600, 700] },
  { family: "Righteous", category: "display", weights: [400] },
  { family: "Permanent Marker", category: "display", weights: [400] },
  { family: "Pacifico", category: "display", weights: [400] },
  { family: "Lobster", category: "display", weights: [400] },
  { family: "Alfa Slab One", category: "display", weights: [400] },

  // Handwriting
  { family: "Dancing Script", category: "handwriting", weights: [400, 700] },
  { family: "Caveat", category: "handwriting", weights: [400, 700] },
  { family: "Great Vibes", category: "handwriting", weights: [400] },
  { family: "Sacramento", category: "handwriting", weights: [400] },
  { family: "Satisfy", category: "handwriting", weights: [400] },

  // Monospace
  { family: "JetBrains Mono", category: "monospace", weights: [400, 500, 700] },
  { family: "Fira Code", category: "monospace", weights: [400, 500, 700] },
  { family: "Source Code Pro", category: "monospace", weights: [400, 500, 700] },
  { family: "IBM Plex Mono", category: "monospace", weights: [400, 500, 700] },
];

const CATEGORY_LABELS: Record<FontEntry["category"], string> = {
  "sans-serif": "Sans Serif",
  serif: "Serif",
  display: "Display",
  handwriting: "Handwriting",
  monospace: "Monospace",
};

export function getCategoryLabel(cat: FontEntry["category"]): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

const catalogSet = new Set(FONT_CATALOG.map(f => f.family));
const loadedFonts = new Set<string>();
const loadingPromises = new Map<string, Promise<void>>();

function getCatalogEntry(family: string): FontEntry | undefined {
  return FONT_CATALOG.find(f => f.family === family);
}

/** Check whether a font family is in our catalog */
export function isKnownFont(family: string): boolean {
  return catalogSet.has(family);
}

/** Build the Google Fonts URL for a family+weights */
function googleFontsUrl(family: string, weights: number[]): string {
  const encoded = family.replace(/ /g, "+");
  const wStr = weights.join(";");
  return `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,${wStr};1,${wStr}&display=swap`;
}

/**
 * Load a single font family. Only loads fonts from FONT_CATALOG.
 * Returns immediately if already loaded.
 */
export function loadFont(family: string): Promise<void> {
  if (loadedFonts.has(family)) return Promise.resolve();
  if (loadingPromises.has(family)) return loadingPromises.get(family)!;

  const entry = getCatalogEntry(family);
  if (!entry) return Promise.resolve(); // unknown font — skip

  const promise = new Promise<void>((resolve) => {
    if (typeof document === "undefined") { resolve(); return; }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = googleFontsUrl(entry.family, entry.weights);
    link.dataset.npngFont = family;

    link.onload = async () => {
      // Wait for the browser to parse the CSS and make fonts available
      try {
        await document.fonts.load(`400 16px "${family}"`);
      } catch { /* best effort */ }
      loadedFonts.add(family);
      resolve();
    };
    link.onerror = () => {
      // Font failed — just proceed with fallback
      resolve();
    };

    document.head.appendChild(link);
  });

  loadingPromises.set(family, promise);
  return promise;
}

/**
 * Load multiple font families in parallel.
 * Only loads fonts that are in FONT_CATALOG.
 */
export async function ensureFontsLoaded(families: Iterable<string>): Promise<void> {
  const toLoad: Promise<void>[] = [];
  for (const family of families) {
    if (!loadedFonts.has(family) && catalogSet.has(family)) {
      toLoad.push(loadFont(family));
    }
  }
  if (toLoad.length > 0) await Promise.all(toLoad);
}

/** Check if a font is already loaded */
export function isFontLoaded(family: string): boolean {
  return loadedFonts.has(family);
}

/** Get all available font families grouped by category */
export function getFontsByCategory(): Map<FontEntry["category"], FontEntry[]> {
  const grouped = new Map<FontEntry["category"], FontEntry[]>();
  for (const entry of FONT_CATALOG) {
    const list = grouped.get(entry.category) ?? [];
    list.push(entry);
    grouped.set(entry.category, list);
  }
  return grouped;
}

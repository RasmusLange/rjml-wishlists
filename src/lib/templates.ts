// The PDF looks a list can be exported in. Shared by the editor and the PDF route.
export const TEMPLATES = [
  { id: "classic", name: "Classic", description: "The original sheet: cobalt on white, one wish per row." },
  { id: "gallery", name: "Gallery", description: "Two columns of cards with big pictures." },
  { id: "compact", name: "Compact", description: "Black and white, many wishes per page, with tick boxes." },
  { id: "festive", name: "Festive", description: "Warm reds and greens on cream, for the holidays." },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];

export function isTemplate(value: unknown): value is TemplateId {
  return TEMPLATES.some((t) => t.id === value);
}

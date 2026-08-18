// Tony's fragrance list captured from the Tony Fragrances Facebook page
// (18 Feb–18 Aug 2026 review; prices from the "July 26" availability post,
// BWP). These are the advertised SELLING prices. Cost price and stock quantity
// are unknown from Facebook, so they start at 0 and are set in the app.
export type CatalogueItem = { name: string; sellingPrice: number };

export const TONY_FACEBOOK_CATALOGUE: CatalogueItem[] = [
  { name: "Ameer Al Oud", sellingPrice: 300 },
  { name: "Woody Oud", sellingPrice: 250 },
  { name: "Kashmiri Oud", sellingPrice: 250 },
  { name: "White Oud", sellingPrice: 250 },
  { name: "Black Oud", sellingPrice: 249.95 },
  { name: "Hayaati Black", sellingPrice: 349.95 },
  { name: "Intense Wayfarer", sellingPrice: 450 },
  { name: "Oud Madness", sellingPrice: 450 },
  { name: "Oud Al Layl", sellingPrice: 349.95 },
  { name: "Mousuf Brown", sellingPrice: 330 },
  { name: "Wild Elixir", sellingPrice: 299.95 },
  { name: "Ur Way", sellingPrice: 349.95 },
  { name: "Weekend Berries combo", sellingPrice: 349.95 },
];

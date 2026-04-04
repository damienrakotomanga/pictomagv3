export const LIVE_SHOPPING_CATEGORY_CARD_MASK_PATH =
  "M3.81,4.12h319v239c-8.3,0-16.61.16-24.9-.11-2.03-.07-4.81-.98-5.89-2.48-5.82-8.01-11.08-16.42-16.78-24.53-4.88-6.93-10.42-13.61-19.8-13.63-61.44-.14-122.88-.14-184.32.02-6.19.02-11.77,2.81-15.44,8.03-6.15,8.77-11.82,17.89-18.06,26.6-1.79,2.5-4.73,5.58-7.37,5.81-8.67.73-17.44.28-26.43.28V4.12Z";

export type LiveShoppingCategoryCardArtSettings = {
  imageSrc: string;
  offsetX: number;
  offsetY: number;
  zoom: number;
};

export function getLiveShoppingCategoryCardDefaultImageSrc(categoryId: string) {
  if (categoryId === "trading-card-games") {
    return "/live-shopping/categories/trading-card-game-test.jpg";
  }

  return `/live-shopping/categories/${categoryId}-v2.jpg`;
}

export function getLiveShoppingCategoryCardDefaultArtSettings(
  categoryId: string,
): LiveShoppingCategoryCardArtSettings {
  return {
    imageSrc: getLiveShoppingCategoryCardDefaultImageSrc(categoryId),
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  };
}

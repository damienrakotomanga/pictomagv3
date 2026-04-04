import { LiveShoppingPage } from "@/components/live-shopping-page";
import { listLiveCategoryCardAssetRows } from "@/lib/server/sqlite-store";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; startLive?: string }>;
}) {
  const params = await searchParams;
  const initialCategoryCardOverrides = Object.fromEntries(
    listLiveCategoryCardAssetRows().map((row) => [
      row.category_id,
      {
        imageSrc: row.image_src,
        offsetX: row.offset_x,
        offsetY: row.offset_y,
        zoom: row.zoom,
      },
    ]),
  );

  return (
    <LiveShoppingPage
      initialCategoryId={params.category ?? null}
      initialStartLiveId={params.startLive ?? null}
      initialCategoryCardOverrides={initialCategoryCardOverrides}
    />
  );
}

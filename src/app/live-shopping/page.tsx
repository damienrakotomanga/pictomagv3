import { LiveShoppingPage } from "@/components/live-shopping-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; startLive?: string }>;
}) {
  const params = await searchParams;
  return (
    <LiveShoppingPage
      initialCategoryId={params.category ?? null}
      initialStartLiveId={params.startLive ?? null}
    />
  );
}

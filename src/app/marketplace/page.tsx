import { MarketplacePage } from "@/components/marketplace-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; order?: string }>;
}) {
  const { view, order } = await searchParams;
  const initialView = view === "seller" || view === "tracker" || view === "create" ? view : "discover";
  const initialOrderId = Number(order);

  return <MarketplacePage initialView={initialView} initialOrderId={Number.isFinite(initialOrderId) ? initialOrderId : null} />;
}

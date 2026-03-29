import { LiveShoppingProductCreatePage } from "@/components/live-shopping-product-create-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const params = await searchParams;

  return <LiveShoppingProductCreatePage productId={params.product ?? null} />;
}

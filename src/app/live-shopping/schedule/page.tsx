import { LiveShoppingSchedulePage } from "@/components/live-shopping-schedule-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
  const params = await searchParams;
  const editValue = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  return <LiveShoppingSchedulePage initialEditId={editValue ?? null} />;
}

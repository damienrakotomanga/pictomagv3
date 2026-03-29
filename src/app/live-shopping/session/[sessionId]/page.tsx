import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveShoppingPage } from "@/components/live-shopping-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const { sessionId } = await params;
  const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

  return {
    metadataBase,
    title: `Session live ${sessionId} | Pictomag`,
    description: "Session live programmee, ouverte pour une diffusion et vente en temps reel.",
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  if (!sessionId?.trim()) {
    notFound();
  }

  return <LiveShoppingPage initialStartLiveId={sessionId} />;
}

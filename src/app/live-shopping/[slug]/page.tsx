import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveShoppingPage } from "@/components/live-shopping-page";
import { getLiveShoppingBySlug, liveShoppingEvents } from "@/lib/live-shopping-data";

export async function generateStaticParams() {
  return liveShoppingEvents.map((event) => ({
    slug: event.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const liveEvent = getLiveShoppingBySlug(slug);
  const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

  if (!liveEvent) {
    return {
      metadataBase,
      title: "Live shopping introuvable | Pictomag",
    };
  }

  return {
    metadataBase,
    title: `${liveEvent.title} | Pictomag Live Shopping`,
    description: liveEvent.subtitle,
    openGraph: {
      title: liveEvent.title,
      description: liveEvent.subtitle,
      images: [
        {
          url: liveEvent.cover,
        },
      ],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!getLiveShoppingBySlug(slug)) {
    notFound();
  }

  return <LiveShoppingPage initialSlug={slug} />;
}

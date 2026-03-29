import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketplaceGigDetailPage } from "@/components/marketplace-gig-detail-page";
import { getMarketplaceGigBySlug, serviceGigs } from "@/lib/marketplace-data";

export async function generateStaticParams() {
  const { getMarketplaceGigSlug } = await import("@/lib/marketplace-data");

  return serviceGigs.map((gig) => ({
    slug: getMarketplaceGigSlug(gig),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const gig = getMarketplaceGigBySlug(slug);
  const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

  if (!gig) {
    return {
      metadataBase,
      title: "Gig introuvable | Pictomag Marketplace",
    };
  }

  return {
    metadataBase,
    title: `${gig.title} | Pictomag Marketplace`,
    description: gig.subtitle,
    openGraph: {
      title: gig.title,
      description: gig.subtitle,
      images: [
        {
          url: gig.cover,
        },
      ],
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ package?: string }>;
}) {
  const { slug } = await params;
  const { package: initialPackageId } = await searchParams;
  const gig = getMarketplaceGigBySlug(slug);

  if (!gig) {
    notFound();
  }

  return <MarketplaceGigDetailPage gig={gig} initialPackageId={initialPackageId ?? null} />;
}

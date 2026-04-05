import { FeedPage } from "@/components/feed-page";

type HomePageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const { mode } = await searchParams;

  const initialMode = mode === "video" ? "video" : mode === "photo" ? "photo" : "classic";

  return <FeedPage initialMode={initialMode} />;
}

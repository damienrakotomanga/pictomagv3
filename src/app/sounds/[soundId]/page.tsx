import { notFound } from "next/navigation";
import { SoundLibraryPage } from "@/components/sound-library-page";
import { getSoundCollectionBySlug } from "@/lib/sound-library";

export default async function SoundPage({
  params,
}: {
  params: Promise<{ soundId: string }>;
}) {
  const { soundId } = await params;

  if (!getSoundCollectionBySlug(soundId)) {
    notFound();
  }

  return <SoundLibraryPage soundId={soundId} />;
}

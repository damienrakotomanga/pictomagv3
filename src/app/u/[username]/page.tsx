import { PublicProfilePage } from "@/components/public-profile-page";

export default async function PublicProfileRoutePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return <PublicProfilePage username={username} />;
}

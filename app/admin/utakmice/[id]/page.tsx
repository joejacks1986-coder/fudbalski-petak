import MatchEditor from "@/components/admin/MatchEditor";

export default async function EditMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <MatchEditor mode="edit" matchId={id} />;
}

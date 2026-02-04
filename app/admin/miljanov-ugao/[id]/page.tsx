import { supabase } from "@/lib/supabase";
import SaveButton from "./SaveButton";

// =====================
// TIPOVI
// =====================
type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ColumnForm = {
  title: string;
  author: string;
  content: string;
};

// =====================
// ADMIN – MILJANOV UGAO
// =====================
export default async function AdminMiljanovUgao({ params }: PageProps) {
  const { id: matchId } = await params;

  // FETCH POSTOJEĆE KOLUMNE
  const { data: column } = await supabase
    .from("match_columns")
    .select("title, author, content")
    .eq("match_id", matchId)
    .single();

  const initialData: ColumnForm = {
    title: column?.title ?? "",
    author: column?.author ?? "Miljan",
    content: column?.content ?? "",
  };

  // =====================
  // SERVER ACTION
  // =====================
  async function saveColumn(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "");
    const author = String(formData.get("author") ?? "");
    const content = String(formData.get("content") ?? "");

    await supabase.from("match_columns").upsert(
      {
        match_id: matchId,
        title,
        author,
        content,
      },
      { onConflict: "match_id" }
    );
  }

  // =====================
  // RENDER
  // =====================
  return (
    <main style={{ padding: 32, maxWidth: 700 }}>
      <h1>📝 Miljanov ugao – Admin</h1>

      <form
        action={saveColumn}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label>Naslov</label>
          <input
            name="title"
            defaultValue={initialData.title}
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div>
          <label>Autor</label>
          <input
            name="author"
            defaultValue={initialData.author}
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div>
          <label>Tekst</label>
          <textarea
            name="content"
            defaultValue={initialData.content}
            rows={10}
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <SaveButton />
      </form>
    </main>
  );
}

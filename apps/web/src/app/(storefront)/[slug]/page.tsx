import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@timsan/db";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.cmsPage.findUnique({
    where: { slug, isPublished: true },
    select: { title: true },
  });
  if (!page) return {};
  return { title: page.title };
}

// Minimal Markdown → safe HTML (no external deps required)
function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^\* (.+)$/gm, "<li>$1</li>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

export default async function CmsPageRoute({ params }: Props) {
  const { slug } = await params;

  const page = await prisma.cmsPage.findUnique({
    where: { slug, isPublished: true },
  });

  if (!page) notFound();

  const html = renderMarkdown(page.content);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">{page.title}</h1>
      <div
        className="prose prose-gray max-w-none text-gray-700 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mb-4 [&_li]:ml-6 [&_li]:list-disc [&_li]:mb-1 [&_strong]:font-semibold"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <p className="mt-10 text-xs text-gray-400">
        Последнее обновление:{" "}
        {new Intl.DateTimeFormat("ru-KZ", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(page.updatedAt)}
      </p>
    </div>
  );
}

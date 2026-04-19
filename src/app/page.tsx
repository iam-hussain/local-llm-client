import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const latest = await prisma.conversation.findFirst({
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  if (latest) redirect(`/c/${latest.id}`);
  const c = await prisma.conversation.create({ data: { title: "New chat" } });
  redirect(`/c/${c.id}`);
}

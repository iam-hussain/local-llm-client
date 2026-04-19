import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [totals, byModelRaw, recent, byDayRaw, convCount] = await Promise.all([
    prisma.message.aggregate({
      where: { role: "assistant" },
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true, generationTime: true },
      _avg: { tokensPerSecond: true, timeToFirstToken: true },
      _count: { _all: true },
    }),
    prisma.message.groupBy({
      by: ["model"],
      where: { role: "assistant", model: { not: null } },
      _sum: { totalTokens: true, completionTokens: true },
      _avg: { tokensPerSecond: true, timeToFirstToken: true },
      _count: { _all: true },
    }),
    prisma.message.findMany({
      where: { role: "assistant", tokensPerSecond: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { createdAt: true, tokensPerSecond: true, timeToFirstToken: true, model: true },
    }),
    prisma.message.aggregateRaw({
      pipeline: [
        { $match: { role: "assistant" } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            tokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
            messages: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 60 },
        { $project: { _id: 0, day: "$_id", tokens: 1, messages: 1 } },
      ],
    }),
    prisma.conversation.count(),
  ]);

  return NextResponse.json({
    totals: {
      messages: totals._count._all,
      conversations: convCount,
      promptTokens: totals._sum.promptTokens ?? 0,
      completionTokens: totals._sum.completionTokens ?? 0,
      totalTokens: totals._sum.totalTokens ?? 0,
      generationTime: totals._sum.generationTime ?? 0,
      avgTokensPerSecond: totals._avg.tokensPerSecond ?? 0,
      avgTTFT: totals._avg.timeToFirstToken ?? 0,
    },
    byModel: byModelRaw.map((r) => ({
      model: r.model,
      messages: r._count._all,
      totalTokens: r._sum.totalTokens ?? 0,
      completionTokens: r._sum.completionTokens ?? 0,
      avgTps: r._avg.tokensPerSecond ?? 0,
      avgTTFT: r._avg.timeToFirstToken ?? 0,
    })),
    recent: recent.reverse(),
    byDay: byDayRaw,
  });
}

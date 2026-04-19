import { NextResponse } from "next/server";
import { listModels } from "@/lib/lm-studio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const models = await listModels();
    return NextResponse.json({ models });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { models: [], error: msg, hint: "Is LM Studio running at 127.0.0.1:1234? Try `lms server start`." },
      { status: 503 },
    );
  }
}

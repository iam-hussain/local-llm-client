const BASE_URL = process.env.LM_STUDIO_BASE_URL ?? "http://127.0.0.1:1234";
const TOKEN = process.env.LM_API_TOKEN ?? "";

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", ...extra };
  if (TOKEN) h["Authorization"] = `Bearer ${TOKEN}`;
  return h;
}

export type LMModel = {
  id: string;
  object: string;
  type: "llm" | "vlm" | "embeddings" | string;
  publisher?: string;
  arch?: string;
  compatibility_type?: string;
  quantization?: string;
  state: "loaded" | "not-loaded" | string;
  max_context_length: number;
  loaded_context_length?: number;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type ChatStats = {
  tokens_per_second: number;
  time_to_first_token: number;
  generation_time: number;
  stop_reason: string;
};

export type ChatUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export async function listModels(): Promise<LMModel[]> {
  const res = await fetch(`${BASE_URL}/api/v0/models`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`LM Studio models list failed: ${res.status}`);
  const data = (await res.json()) as { data: LMModel[] };
  return data.data;
}

export async function getModel(id: string): Promise<LMModel> {
  const res = await fetch(`${BASE_URL}/api/v0/models/${encodeURIComponent(id)}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`LM Studio model ${id} failed: ${res.status}`);
  return (await res.json()) as LMModel;
}

export type StreamChunk =
  | { type: "delta"; content: string }
  | { type: "done"; usage?: ChatUsage; stats?: ChatStats; model?: string };

export async function* streamChat(opts: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
}): AsyncGenerator<StreamChunk> {
  const res = await fetch(`${BASE_URL}/api/v0/chat/completions`, {
    method: "POST",
    headers: headers(),
    signal: opts.signal,
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? -1,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Chat stream failed: ${res.status} ${msg}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let usage: ChatUsage | undefined;
  let stats: ChatStats | undefined;
  let model: string | undefined;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        model = json.model ?? model;
        if (json.usage) usage = json.usage;
        if (json.stats) stats = json.stats;
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield { type: "delta", content: delta };
      } catch {
        /* ignore */
      }
    }
  }

  yield { type: "done", usage, stats, model };
}

export async function embed(text: string, model: string): Promise<number[]> {
  const res = await fetch(`${BASE_URL}/api/v0/embeddings`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ model, input: text }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${res.status}`);
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0]?.embedding ?? [];
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function packVector(v: number[]): string {
  return JSON.stringify(v);
}
export function unpackVector(s: string): number[] {
  return JSON.parse(s) as number[];
}

export function getBaseUrl() {
  return BASE_URL;
}

"use client";
import { useEffect, useState } from "react";
import { Activity, Clock, Gauge, Hash, MessageSquare, Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatTime } from "@/lib/utils";

type Stats = {
  totals: {
    messages: number;
    conversations: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    generationTime: number;
    avgTokensPerSecond: number;
    avgTTFT: number;
  };
  byModel: Array<{
    model: string | null;
    messages: number;
    totalTokens: number;
    completionTokens: number;
    avgTps: number;
    avgTTFT: number;
  }>;
  recent: Array<{ createdAt: string; tokensPerSecond: number | null; timeToFirstToken: number | null; model: string | null }>;
  byDay: Array<{ day: string; tokens: number; messages: number }>;
};

export function StatsDashboard() {
  const [data, setData] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      const r = await fetch("/api/stats", { cache: "no-store" });
      if (r.ok) setData(await r.json());
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  if (!data) return <div className="p-8 text-sm text-muted-foreground">Loading stats…</div>;

  const recentChart = data.recent.map((r, i) => ({
    i,
    tps: r.tokensPerSecond,
    ttft: r.timeToFirstToken,
    model: r.model,
  }));

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Stats</h1>
        <p className="text-sm text-muted-foreground">Everything your local model has produced — updated every 10s.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={<MessageSquare className="size-4" />} label="Conversations" value={formatNumber(data.totals.conversations, 0)} />
        <Stat icon={<Activity className="size-4" />} label="Assistant messages" value={formatNumber(data.totals.messages, 0)} />
        <Stat icon={<Hash className="size-4" />} label="Total tokens" value={formatNumber(data.totals.totalTokens, 1)} />
        <Stat icon={<Clock className="size-4" />} label="Total generation" value={formatTime(data.totals.generationTime)} />
        <Stat icon={<Zap className="size-4" />} label="Avg tok/s" value={data.totals.avgTokensPerSecond.toFixed(1)} />
        <Stat icon={<Gauge className="size-4" />} label="Avg TTFT" value={formatTime(data.totals.avgTTFT)} />
        <Stat icon={<Hash className="size-4" />} label="Prompt tokens" value={formatNumber(data.totals.promptTokens, 1)} />
        <Stat icon={<Hash className="size-4" />} label="Output tokens" value={formatNumber(data.totals.completionTokens, 1)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Throughput trend</CardTitle>
            <CardDescription>Last 50 responses — tokens per second</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recentChart}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="i" hide />
                <YAxis tick={{ fontSize: 10 }} />
                <RTooltip />
                <Line type="monotone" dataKey="tps" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>TTFT trend</CardTitle>
            <CardDescription>Time to first token, seconds</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recentChart}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="i" hide />
                <YAxis tick={{ fontSize: 10 }} />
                <RTooltip />
                <Line type="monotone" dataKey="ttft" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Tokens per day</CardTitle>
            <CardDescription>Last 60 days</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byDay}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <RTooltip />
                <Bar dataKey="tokens" fill="var(--chart-2)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By model</CardTitle>
          <CardDescription>Volume and speed per model used</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2">Model</th>
                  <th className="py-2">Messages</th>
                  <th className="py-2">Output tokens</th>
                  <th className="py-2">Total tokens</th>
                  <th className="py-2">Avg tok/s</th>
                  <th className="py-2">Avg TTFT</th>
                </tr>
              </thead>
              <tbody>
                {data.byModel.map((m) => (
                  <tr key={m.model ?? "—"} className="border-t">
                    <td className="py-2 font-mono text-xs">{m.model ?? "—"}</td>
                    <td className="py-2">{m.messages}</td>
                    <td className="py-2">{formatNumber(m.completionTokens, 0)}</td>
                    <td className="py-2">{formatNumber(m.totalTokens, 0)}</td>
                    <td className="py-2">{m.avgTps.toFixed(1)}</td>
                    <td className="py-2">{formatTime(m.avgTTFT)}</td>
                  </tr>
                ))}
                {data.byModel.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs">No data yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

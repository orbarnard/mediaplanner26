"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlanCard } from "@/components/plan-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, BarChart3, FileText } from "lucide-react";

interface Plan {
  id: string;
  clientName: string;
  clientType: "CANDIDATE" | "ISSUE_ADVOCACY" | "PAC";
  status: "DRAFT" | "IN_REVIEW" | "APPROVED";
  startDate: string;
  endDate: string;
  flightLengthDays: number;
  flightLengthWeeks: number;
  electionType: "PRIMARY" | "GENERAL";
}

export default function DashboardPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/plans");
        if (!res.ok) throw new Error("Failed to fetch plans");
        const data = await res.json();
        setPlans(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load plans");
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  async function createPlan() {
    if (!newPlanName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: newPlanName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create plan");
      const plan = await res.json();
      router.push(`/plans/${plan.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create plan");
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage-500">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tally</h1>
              <p className="text-xs text-gray-500">
                Sage Media Planning & Placement
              </p>
            </div>
          </div>
          <Button onClick={() => setShowNewPlan(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Plan
          </Button>
        </div>
      </header>

      {/* Quick create dialog */}
      {showNewPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">New Media Plan</h3>
            <p className="mt-1 text-sm text-gray-500">
              Name your plan and start building. You can configure details in Settings.
            </p>
            <div className="mt-4">
              <Input
                autoFocus
                placeholder="e.g. Johnson for Senate"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createPlan();
                  if (e.key === "Escape") setShowNewPlan(false);
                }}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewPlan(false);
                  setNewPlanName("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={createPlan}
                disabled={!newPlanName.trim() || creating}
              >
                {creating ? "Creating..." : "Create & Build"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Media Plans</h2>
          <p className="text-sm text-gray-500">
            Manage your media plans for political campaigns and issue advocacy.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-500" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-20">
            <FileText className="h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No plans yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first media plan to get started.
            </p>
            <Button className="mt-6" onClick={() => setShowNewPlan(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Plan
            </Button>
          </div>
        )}

        {!loading && !error && plans.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Link key={plan.id} href={`/plans/${plan.id}`}>
                <PlanCard {...plan} />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

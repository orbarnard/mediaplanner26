"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PlanHeader } from "@/components/plan-header";
import { PlanningGrid } from "@/components/planning-grid";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Download,
  Share2,
  Pencil,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const MEDIA_SECTIONS = [
  { key: "BROADCAST_TV", label: "Broadcast TV English" },
  { key: "SPANISH_TV", label: "Spanish-Language TV" },
  { key: "CABLE", label: "Cable" },
  { key: "RADIO", label: "Radio" },
  { key: "DIGITAL_OTT", label: "Digital/OTT" },
  { key: "DISPLAY", label: "Display" },
  { key: "STREAMING", label: "Streaming" },
];

interface FlightWeek {
  id: string;
  weekNumber: number;
  label: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
}

interface Plan {
  id: string;
  clientName: string;
  clientType: "CANDIDATE" | "ISSUE_ADVOCACY" | "PAC";
  status: "DRAFT" | "IN_REVIEW" | "APPROVED";
  startDate: string;
  endDate: string;
  windowDate: string;
  flightLengthDays: number;
  flightLengthWeeks: number;
  electionType: "PRIMARY" | "GENERAL";
  commissionPct: number;
  markets: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string; type: string }>;
  flightWeeks: FlightWeek[];
}

export default function PlanViewPage() {
  const params = useParams();
  const planId = params.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("BROADCAST_TV");
  const [sageOpen, setSageOpen] = useState(false);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch(`/api/plans/${planId}`);
        if (!res.ok) throw new Error("Failed to fetch plan");
        const data = await res.json();
        setPlan(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load plan");
      } finally {
        setLoading(false);
      }
    }
    if (planId) fetchPlan();
  }, [planId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-500" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-red-600">{error || "Plan not found"}</p>
        <Link href="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Top nav */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-full items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-500">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Tally</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-300" />
            <span className="text-sm text-gray-600">{plan.clientName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Link href={`/plans/${planId}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Plan
              </Button>
            </Link>
            <Button
              variant={sageOpen ? "default" : "outline"}
              size="sm"
              onClick={() => setSageOpen(!sageOpen)}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Sage AI
            </Button>
          </div>
        </div>
      </header>

      {/* Plan header */}
      <PlanHeader
        clientName={plan.clientName}
        clientType={plan.clientType}
        status={plan.status}
        startDate={plan.startDate}
        endDate={plan.endDate}
        windowDate={plan.windowDate}
        flightLengthDays={plan.flightLengthDays}
        flightLengthWeeks={plan.flightLengthWeeks}
        electionType={plan.electionType}
        commissionPct={plan.commissionPct}
      />

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-auto">
          {/* Section tabs */}
          <div className="border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
            <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Media sections">
              {MEDIA_SECTIONS.map((section) => (
                <button
                  key={section.key}
                  onClick={() => setActiveTab(section.key)}
                  className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === section.key
                      ? "border-sage-500 text-sage-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Planning grid */}
          <div className="p-4 sm:p-6 lg:p-8">
            {plan.sections
              .filter((s) => s.type === activeTab)
              .map((section) => (
                <PlanningGrid
                  key={section.id}
                  planId={planId}
                  sectionId={section.id}
                  sectionType={section.type}
                  sectionName={section.name}
                  flightWeeks={plan.flightWeeks}
                  markets={plan.markets}
                  commissionPct={plan.commissionPct}
                />
              ))}

            {/* Markets summary */}
            {plan.markets && plan.markets.length > 0 && (
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
                <h4 className="text-sm font-semibold text-gray-900">
                  Markets ({plan.markets.length})
                </h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plan.markets.map((market) => (
                    <span
                      key={market.id}
                      className="inline-flex items-center rounded-full bg-sage-50 px-3 py-1 text-xs font-medium text-sage-700"
                    >
                      {market.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sage AI Sidebar */}
        {sageOpen && (
          <div className="flex w-96 flex-col border-l border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sage-500">
                  <MessageSquare className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  Sage AI
                </span>
              </div>
              <button
                onClick={() => setSageOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-50">
                <MessageSquare className="h-6 w-6 text-sage-500" />
              </div>
              <h4 className="mt-3 text-sm font-semibold text-gray-900">
                Ask Sage anything
              </h4>
              <p className="mt-1 text-xs text-gray-500">
                Sage has full context on this media plan. Ask about spend,
                markets, flight timing, or request scenario changes.
              </p>
            </div>

            <div className="border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask Sage a question..."
                  className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
                  disabled
                />
                <Button size="sm" disabled>
                  Send
                </Button>
              </div>
              <p className="mt-2 text-center text-xs text-gray-400">
                AI assistant coming soon
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

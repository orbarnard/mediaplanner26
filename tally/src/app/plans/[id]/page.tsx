"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlanSettings } from "@/components/plan-settings";
import { MediaSectionCanvas } from "@/components/media-section-canvas";
import {
  BarChart3,
  Download,
  Share2,
  Settings,
  MessageSquare,
  ChevronRight,
  X,
} from "lucide-react";

interface FlightWeek {
  id: string;
  weekNumber: number;
  label: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
}

interface Market {
  id: string;
  name: string;
  districtVotePct: number | null;
  hispanicPct: number | null;
  cppQ3OOW_A35: number | null;
  cppQ3IW_A35: number | null;
  cppEarlyQ4_A35: number | null;
  cppLateQ4_A35: number | null;
  cppQ3OOW_H25: number | null;
  cppQ3IW_H25: number | null;
  cppEarlyQ4_H25: number | null;
  cppLateQ4_H25: number | null;
}

interface Section {
  id: string;
  name: string;
  type: string;
  sortOrder: number;
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
  isElectionWeek: boolean;
  markets: Market[];
  sections: Section[];
  flightWeeks: FlightWeek[];
}

const SECTION_CONFIG: Record<string, { label: string; isDigital: boolean }> = {
  BROADCAST_TV: { label: "Broadcast TV", isDigital: false },
  SPANISH_TV: { label: "Spanish-Language TV", isDigital: false },
  CABLE: { label: "Cable", isDigital: false },
  RADIO: { label: "Radio", isDigital: false },
  DIGITAL_OTT: { label: "Digital/OTT", isDigital: true },
  DISPLAY: { label: "Display", isDigital: true },
  STREAMING: { label: "Streaming", isDigital: true },
};

export default function PlanViewPage() {
  const params = useParams();
  const planId = params.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<"none" | "settings" | "sage">("none");

  const fetchPlan = useCallback(async () => {
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
  }, [planId]);

  useEffect(() => {
    if (planId) fetchPlan();
  }, [planId, fetchPlan]);

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

  const sortedWeeks = [...plan.flightWeeks].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Top nav */}
      <header className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sage-500">
                <BarChart3 className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-900">Tally</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-300" />
            <span className="text-sm font-medium text-gray-700">{plan.clientName}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {plan.flightLengthDays}D / {plan.flightLengthWeeks}W
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="text-xs">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </Button>
            <Button variant="ghost" size="sm" className="text-xs">
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share
            </Button>
            <div className="mx-1 h-5 w-px bg-gray-200" />
            <Button
              variant={rightPanel === "settings" ? "default" : "ghost"}
              size="sm"
              className="text-xs"
              onClick={() => setRightPanel(rightPanel === "settings" ? "none" : "settings")}
            >
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Settings
            </Button>
            <Button
              variant={rightPanel === "sage" ? "default" : "ghost"}
              size="sm"
              className="text-xs"
              onClick={() => setRightPanel(rightPanel === "sage" ? "none" : "sage")}
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Sage
            </Button>
          </div>
        </div>
      </header>

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main canvas */}
        <div className="flex-1 overflow-auto px-4 py-4 sm:px-6">
          {/* Section canvases stacked vertically */}
          <div className="space-y-4">
            {plan.sections
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((section) => {
                const config = SECTION_CONFIG[section.type];
                return (
                  <MediaSectionCanvas
                    key={section.id}
                    planId={planId}
                    sectionId={section.id}
                    sectionName={config?.label || section.name}
                    sectionType={section.type}
                    isDigital={config?.isDigital || false}
                    flightWeeks={sortedWeeks}
                    markets={plan.markets}
                    commissionPct={plan.commissionPct}
                    windowDate={plan.windowDate}
                    endDate={plan.endDate}
                  />
                );
              })}
          </div>

          {/* Grand total */}
          <div className="mt-4 rounded-lg border border-sage-200 bg-sage-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-sage-800">Grand Total</span>
              <span className="text-xs text-sage-600">
                Totals update as you add line items above
              </span>
            </div>
          </div>
        </div>

        {/* Right panel: Settings */}
        {rightPanel === "settings" && (
          <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white overflow-auto">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <span className="text-sm font-semibold text-gray-900">Plan Settings</span>
              <button
                onClick={() => setRightPanel("none")}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <PlanSettings plan={plan} onUpdate={fetchPlan} />
          </div>
        )}

        {/* Right panel: Sage AI */}
        {rightPanel === "sage" && (
          <div className="flex w-96 flex-shrink-0 flex-col border-l border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sage-500">
                  <MessageSquare className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-900">Sage AI</span>
              </div>
              <button
                onClick={() => setRightPanel("none")}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-50">
                <MessageSquare className="h-6 w-6 text-sage-500" />
              </div>
              <h4 className="mt-3 text-sm font-semibold text-gray-900">Ask Sage anything</h4>
              <p className="mt-1 text-xs text-gray-500">
                Sage has full context on this media plan. Ask about spend, markets, flight timing, or request scenario changes.
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
                <Button size="sm" disabled>Send</Button>
              </div>
              <p className="mt-2 text-center text-xs text-gray-400">AI assistant coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

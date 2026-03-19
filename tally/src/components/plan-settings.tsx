"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Plus, Save } from "lucide-react";
import { format } from "date-fns";

const COMMON_DMAS = [
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Philadelphia, PA",
  "Dallas-Ft. Worth, TX", "San Francisco-Oakland-San Jose, CA", "Boston, MA",
  "Atlanta, GA", "Washington, DC", "Houston, TX", "Detroit, MI", "Phoenix, AZ",
  "Tampa-St. Petersburg, FL", "Seattle-Tacoma, WA", "Minneapolis-St. Paul, MN",
  "Miami-Ft. Lauderdale, FL", "Denver, CO", "Orlando-Daytona Beach, FL",
  "Cleveland-Akron, OH", "Sacramento-Stockton, CA", "St. Louis, MO",
  "Pittsburgh, PA", "Portland, OR", "Charlotte, NC", "Indianapolis, IN",
  "Baltimore, MD", "Raleigh-Durham, NC", "Nashville, TN", "San Diego, CA",
  "Columbus, OH", "Salt Lake City, UT", "Milwaukee, WI", "Las Vegas, NV",
  "San Antonio, TX", "Kansas City, MO", "Austin, TX",
];

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

interface Plan {
  id: string;
  clientName: string;
  clientType: "CANDIDATE" | "ISSUE_ADVOCACY" | "PAC";
  electionType: "PRIMARY" | "GENERAL";
  startDate: string;
  endDate: string;
  windowDate: string;
  flightLengthDays: number;
  flightLengthWeeks: number;
  commissionPct: number;
  isElectionWeek: boolean;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED";
  markets: Market[];
}

interface PlanSettingsProps {
  plan: Plan;
  onUpdate: () => void;
}

export function PlanSettings({ plan, onUpdate }: PlanSettingsProps) {
  const [clientName, setClientName] = useState(plan.clientName);
  const [clientType, setClientType] = useState(plan.clientType);
  const [electionType, setElectionType] = useState(plan.electionType);
  const [startDate, setStartDate] = useState(format(new Date(plan.startDate), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(plan.endDate), "yyyy-MM-dd"));
  const [commissionPct, setCommissionPct] = useState(String(plan.commissionPct * 100));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Market management
  const [marketSearch, setMarketSearch] = useState("");
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);

  const filteredDMAs = marketSearch
    ? COMMON_DMAS.filter(
        (dma) =>
          dma.toLowerCase().includes(marketSearch.toLowerCase()) &&
          !plan.markets.some((m) => m.name === dma)
      ).slice(0, 6)
    : [];

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientType,
          electionType,
          startDate,
          endDate,
          commissionPct: parseFloat(commissionPct) / 100,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdate();
    } catch {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function addMarket(name: string) {
    setMarketSearch("");
    setShowMarketDropdown(false);
    try {
      await fetch(`/api/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addMarket: { name },
        }),
      });
      onUpdate();
    } catch {
      alert("Failed to add market");
    }
  }

  async function removeMarket(marketId: string) {
    try {
      await fetch(`/api/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          removeMarketId: marketId,
        }),
      });
      onUpdate();
    } catch {
      alert("Failed to remove market");
    }
  }

  return (
    <div className="p-4 space-y-6">
      {/* Client Info */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Client Info
        </h4>
        <div>
          <Label className="text-xs">Client Name</Label>
          <Input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Client Type</Label>
          <Select value={clientType} onValueChange={(v) => setClientType(v as Plan["clientType"])}>
            <SelectTrigger className="mt-1 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CANDIDATE">Candidate</SelectItem>
              <SelectItem value="ISSUE_ADVOCACY">Issue Advocacy</SelectItem>
              <SelectItem value="PAC">PAC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Election Config */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Election
        </h4>
        <div>
          <Label className="text-xs">Election Type</Label>
          <Select value={electionType} onValueChange={(v) => setElectionType(v as Plan["electionType"])}>
            <SelectTrigger className="mt-1 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRIMARY">Primary</SelectItem>
              <SelectItem value="GENERAL">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Flight Dates
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Start</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">End</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>
        <div className="rounded bg-gray-50 px-3 py-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Window Date</span>
            <span className="font-medium text-gray-700">
              {format(new Date(plan.windowDate), "MMM d, yyyy")}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-gray-500">Flight Length</span>
            <span className="font-medium text-gray-700">
              {plan.flightLengthDays}D / {plan.flightLengthWeeks}W
            </span>
          </div>
        </div>
      </div>

      {/* Commission */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Commission
        </h4>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value)}
            className="h-8 w-20 text-sm"
            min="0"
            max="100"
            step="0.5"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
      </div>

      {/* Save button */}
      <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
        {saving ? "Saving..." : saved ? "Saved!" : (
          <>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save Settings
          </>
        )}
      </Button>

      {/* Markets */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Markets ({plan.markets.length})
        </h4>

        {/* Market search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Add a DMA market..."
            value={marketSearch}
            onChange={(e) => {
              setMarketSearch(e.target.value);
              setShowMarketDropdown(true);
            }}
            onFocus={() => setShowMarketDropdown(true)}
            className="h-8 pl-8 text-xs"
          />
          {showMarketDropdown && filteredDMAs.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded border border-gray-200 bg-white py-1 shadow-lg">
              {filteredDMAs.map((dma) => (
                <button
                  key={dma}
                  onClick={() => addMarket(dma)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-sage-50"
                >
                  <Plus className="h-3 w-3 text-sage-500" />
                  {dma}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Market list */}
        <div className="space-y-1.5">
          {plan.markets.map((market) => (
            <div
              key={market.id}
              className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 px-3 py-1.5"
            >
              <span className="text-xs font-medium text-gray-700">{market.name}</span>
              <button
                onClick={() => removeMarket(market.id)}
                className="rounded p-0.5 text-gray-400 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

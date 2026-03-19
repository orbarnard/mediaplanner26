"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  ArrowLeft,
  ArrowRight,
  Check,
  BarChart3,
  X,
  Search,
} from "lucide-react";
import { differenceInDays, subDays, format } from "date-fns";

const STEPS = [
  "Client Info",
  "Election Config",
  "Dates",
  "Markets",
  "Review & Create",
];

const COMMON_DMAS = [
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Philadelphia, PA",
  "Dallas-Ft. Worth, TX",
  "San Francisco-Oakland-San Jose, CA",
  "Boston, MA",
  "Atlanta, GA",
  "Washington, DC",
  "Houston, TX",
  "Detroit, MI",
  "Phoenix, AZ",
  "Tampa-St. Petersburg, FL",
  "Seattle-Tacoma, WA",
  "Minneapolis-St. Paul, MN",
  "Miami-Ft. Lauderdale, FL",
  "Denver, CO",
  "Orlando-Daytona Beach, FL",
  "Cleveland-Akron, OH",
  "Sacramento-Stockton, CA",
  "St. Louis, MO",
  "Pittsburgh, PA",
  "Portland, OR",
  "Charlotte, NC",
  "Indianapolis, IN",
  "Baltimore, MD",
  "Raleigh-Durham, NC",
  "Nashville, TN",
  "San Diego, CA",
  "Columbus, OH",
  "Salt Lake City, UT",
  "Milwaukee, WI",
  "Las Vegas, NV",
  "San Antonio, TX",
  "Kansas City, MO",
  "Austin, TX",
];

interface MarketEntry {
  name: string;
  districtVotePct: number;
  hispanicPct: number;
  cppQ3OOW_A35: number;
  cppQ3IW_A35: number;
  cppEarlyQ4_A35: number;
  cppLateQ4_A35: number;
}

export default function NewPlanPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Client Info
  const [clientName, setClientName] = useState("");
  const [clientType, setClientType] = useState<string>("");

  // Step 2: Election Config
  const [electionType, setElectionType] = useState<string>("");
  const [isElectionWeek, setIsElectionWeek] = useState(false);

  // Step 3: Dates
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Step 4: Markets
  const [markets, setMarkets] = useState<MarketEntry[]>([]);
  const [marketSearch, setMarketSearch] = useState("");
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);

  // Calculated values
  const windowDate = useMemo(() => {
    if (!endDate) return "";
    return format(subDays(new Date(endDate), 45), "yyyy-MM-dd");
  }, [endDate]);

  const flightLengthDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return differenceInDays(new Date(endDate), new Date(startDate));
  }, [startDate, endDate]);

  const flightLengthWeeks = useMemo(() => {
    return Math.ceil(flightLengthDays / 7);
  }, [flightLengthDays]);

  const filteredDMAs = useMemo(() => {
    if (!marketSearch) return [];
    const search = marketSearch.toLowerCase();
    return COMMON_DMAS.filter(
      (dma) =>
        dma.toLowerCase().includes(search) &&
        !markets.some((m) => m.name === dma)
    ).slice(0, 8);
  }, [marketSearch, markets]);

  function addMarket(name: string) {
    setMarkets((prev) => [
      ...prev,
      {
        name,
        districtVotePct: 0,
        hispanicPct: 0,
        cppQ3OOW_A35: 0,
        cppQ3IW_A35: 0,
        cppEarlyQ4_A35: 0,
        cppLateQ4_A35: 0,
      },
    ]);
    setMarketSearch("");
    setShowMarketDropdown(false);
  }

  function removeMarket(name: string) {
    setMarkets((prev) => prev.filter((m) => m.name !== name));
  }

  function updateMarketCPP(
    index: number,
    field: keyof MarketEntry,
    value: number
  ) {
    setMarkets((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  }

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return clientName.trim().length > 0 && clientType !== "";
      case 1:
        return electionType !== "";
      case 2:
        return startDate !== "" && endDate !== "" && flightLengthDays > 0;
      case 3:
        return markets.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientType,
          electionType,
          isElectionWeek,
          startDate,
          endDate,
          commissionPct: 0.15,
          markets,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create plan");
      }

      const plan = await res.json();
      router.push(`/plans/${plan.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create plan");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage-500">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Tally</span>
            </Link>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-bold text-gray-900">Create New Plan</h2>

        {/* Step indicator */}
        <div className="mt-6 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  i < step
                    ? "bg-sage-500 text-white"
                    : i === step
                    ? "border-2 border-sage-500 text-sage-600"
                    : "border border-gray-300 text-gray-400"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`hidden text-sm sm:inline ${
                  i === step
                    ? "font-medium text-sage-600"
                    : i < step
                    ? "text-gray-600"
                    : "text-gray-400"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-6 sm:w-10 ${
                    i < step ? "bg-sage-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {/* Step 1: Client Info */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Client Information
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enter the client details for this media plan.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    placeholder="e.g. Johnson for Senate"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="clientType">Client Type</Label>
                  <Select value={clientType} onValueChange={setClientType}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select client type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CANDIDATE">Candidate</SelectItem>
                      <SelectItem value="ISSUE_ADVOCACY">
                        Issue Advocacy
                      </SelectItem>
                      <SelectItem value="PAC">PAC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Election Config */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Election Configuration
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure the election type and timing.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="electionType">Election Type</Label>
                  <Select
                    value={electionType}
                    onValueChange={setElectionType}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select election type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRIMARY">Primary</SelectItem>
                      <SelectItem value="GENERAL">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isElectionWeek}
                    onClick={() => setIsElectionWeek(!isElectionWeek)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      isElectionWeek ? "bg-sage-500" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        isElectionWeek ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <Label>Is Election Week</Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Dates */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Flight Dates
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Set the start and end dates for the media plan flight.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
              {startDate && endDate && flightLengthDays > 0 && (
                <div className="grid gap-4 rounded-md bg-sage-50 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-sage-600">
                      Window Date
                    </p>
                    <p className="mt-1 text-sm font-medium text-sage-800">
                      {format(new Date(windowDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-sage-600">
                      Flight Length
                    </p>
                    <p className="mt-1 text-sm font-medium text-sage-800">
                      {flightLengthDays}D / {flightLengthWeeks}W
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Markets */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Market Selection
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add DMA markets and configure CPP values for each.
                </p>
              </div>

              {/* Market search */}
              <div className="relative">
                <Label htmlFor="marketSearch">Add Market</Label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="marketSearch"
                    placeholder="Search DMA markets..."
                    value={marketSearch}
                    onChange={(e) => {
                      setMarketSearch(e.target.value);
                      setShowMarketDropdown(true);
                    }}
                    onFocus={() => setShowMarketDropdown(true)}
                    className="pl-9"
                  />
                </div>
                {showMarketDropdown && filteredDMAs.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                    {filteredDMAs.map((dma) => (
                      <button
                        key={dma}
                        type="button"
                        onClick={() => addMarket(dma)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-sage-50 hover:text-sage-700"
                      >
                        {dma}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected markets */}
              {markets.length > 0 && (
                <div className="space-y-3">
                  {markets.map((market, idx) => (
                    <div
                      key={market.name}
                      className="rounded-md border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          {market.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeMarket(market.name)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                          <Label className="text-xs">Q3 OOW CPP</Label>
                          <Input
                            type="number"
                            value={market.cppQ3OOW_A35 || ""}
                            onChange={(e) =>
                              updateMarketCPP(
                                idx,
                                "cppQ3OOW_A35",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Q3 IW CPP</Label>
                          <Input
                            type="number"
                            value={market.cppQ3IW_A35 || ""}
                            onChange={(e) =>
                              updateMarketCPP(
                                idx,
                                "cppQ3IW_A35",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Early Q4 CPP</Label>
                          <Input
                            type="number"
                            value={market.cppEarlyQ4_A35 || ""}
                            onChange={(e) =>
                              updateMarketCPP(
                                idx,
                                "cppEarlyQ4_A35",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Late Q4 CPP</Label>
                          <Input
                            type="number"
                            value={market.cppLateQ4_A35 || ""}
                            onChange={(e) =>
                              updateMarketCPP(
                                idx,
                                "cppLateQ4_A35",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {markets.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">
                  No markets added yet. Search and select DMA markets above.
                </p>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Review & Create
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Review the plan details before creating.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-md bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-gray-500">
                    Client Information
                  </h4>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="text-sm font-medium text-gray-900">
                        {clientName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Type</p>
                      <p className="text-sm font-medium text-gray-900">
                        {clientType === "CANDIDATE"
                          ? "Candidate"
                          : clientType === "ISSUE_ADVOCACY"
                          ? "Issue Advocacy"
                          : "PAC"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-gray-500">
                    Election Configuration
                  </h4>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-400">Type</p>
                      <p className="text-sm font-medium text-gray-900">
                        {electionType === "PRIMARY" ? "Primary" : "General"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Election Week</p>
                      <p className="text-sm font-medium text-gray-900">
                        {isElectionWeek ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-gray-500">
                    Flight Dates
                  </h4>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-gray-400">Start</p>
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(startDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">End</p>
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(endDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Window</p>
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(windowDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Flight</p>
                      <p className="text-sm font-medium text-gray-900">
                        {flightLengthDays}D / {flightLengthWeeks}W
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-gray-500">
                    Markets ({markets.length})
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {markets.map((m) => (
                      <span
                        key={m.name}
                        className="inline-flex items-center rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-medium text-sage-700"
                      >
                        {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create Plan
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

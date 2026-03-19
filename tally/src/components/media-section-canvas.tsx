"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Search,
  MapPin,
  Tv,
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
  cppQ3OOW_A35: number | null;
  cppQ3IW_A35: number | null;
  cppEarlyQ4_A35: number | null;
  cppLateQ4_A35: number | null;
}

interface WeekValue {
  id?: string;
  flightWeekId: string;
  plannedPoints: number | null;
  plannedImpressions: number | null;
  plannedCost: number;
}

interface LineItem {
  id: string;
  tacticName: string;
  marketId: string | null;
  audienceDemo: string | null;
  adServingEnabled: boolean;
  weekValues: WeekValue[];
  cpm?: number;
}

interface DigitalTactic {
  id: string;
  searchKey: string;
  displayName: string;
  platform: string | null;
  adLength: string | null;
  cpm: number;
  platformType: string;
}

interface MediaSectionCanvasProps {
  planId: string;
  sectionId: string;
  sectionName: string;
  sectionType?: string;
  isDigital: boolean;
  flightWeeks: FlightWeek[];
  markets: Market[];
  commissionPct: number;
  windowDate?: string;
  endDate?: string;
}

export function MediaSectionCanvas({
  planId,
  sectionId,
  sectionName,
  isDigital,
  flightWeeks,
  markets,
  commissionPct,
}: MediaSectionCanvasProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Digital tactic picker state
  const [showTacticPicker, setShowTacticPicker] = useState(false);
  const [tacticSearch, setTacticSearch] = useState("");
  const [tacticResults, setTacticResults] = useState<DigitalTactic[]>([]);
  const [searchingTactics, setSearchingTactics] = useState(false);

  // Market picker for linear
  const [showMarketPicker, setShowMarketPicker] = useState(false);

  // Active cell for keyboard nav
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    async function fetchLineItems() {
      try {
        const res = await fetch(`/api/plans/${planId}/sections/${sectionId}/line-items`);
        if (res.ok) setLineItems(await res.json());
      } catch {
        console.error("Failed to fetch line items");
      } finally {
        setLoading(false);
      }
    }
    fetchLineItems();
  }, [planId, sectionId]);

  // Search digital tactics
  useEffect(() => {
    if (!tacticSearch || tacticSearch.length < 2) {
      setTacticResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingTactics(true);
      try {
        const res = await fetch(`/api/digital-tactics?search=${encodeURIComponent(tacticSearch)}`);
        if (res.ok) setTacticResults(await res.json());
      } catch {
        // ignore
      } finally {
        setSearchingTactics(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [tacticSearch]);

  // Add a line item (linear = from market, digital = from tactic DB)
  const addLineItemFromMarket = async (market: Market) => {
    setShowMarketPicker(false);
    try {
      const res = await fetch(`/api/plans/${planId}/sections/${sectionId}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tacticName: market.name,
          marketId: market.id,
        }),
      });
      if (res.ok) {
        const newItem = await res.json();
        setLineItems((prev) => [...prev, newItem]);
      }
    } catch {
      console.error("Failed to add line item");
    }
  };

  const addLineItemFromTactic = async (tactic: DigitalTactic) => {
    setShowTacticPicker(false);
    setTacticSearch("");
    try {
      const res = await fetch(`/api/plans/${planId}/sections/${sectionId}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tacticName: tactic.displayName,
        }),
      });
      if (res.ok) {
        const newItem = await res.json();
        // Store CPM locally for cost calculations
        newItem.cpm = tactic.cpm;
        setLineItems((prev) => [...prev, newItem]);
      }
    } catch {
      console.error("Failed to add line item");
    }
  };

  const addBlankLineItem = async () => {
    try {
      const res = await fetch(`/api/plans/${planId}/sections/${sectionId}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tacticName: "" }),
      });
      if (res.ok) {
        const newItem = await res.json();
        setLineItems((prev) => [...prev, newItem]);
      }
    } catch {
      console.error("Failed to add line item");
    }
  };

  const deleteLineItem = async (lineItemId: string) => {
    try {
      await fetch(`/api/plans/${planId}/sections/${sectionId}/line-items/${lineItemId}`, {
        method: "DELETE",
      });
      setLineItems((prev) => prev.filter((li) => li.id !== lineItemId));
    } catch {
      console.error("Failed to delete line item");
    }
  };

  const updateLineItemName = (index: number, name: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], tacticName: name };
    setLineItems(updated);
  };

  // Update cell value
  const updateCellValue = useCallback(
    async (rowIndex: number, weekId: string, rawValue: string) => {
      const value = rawValue ? parseFloat(rawValue) : null;
      const lineItem = lineItems[rowIndex];
      const field = isDigital ? "plannedImpressions" : "plannedPoints";

      const existingValue = lineItem.weekValues.find((wv) => wv.flightWeekId === weekId);
      const updatedValue: WeekValue = existingValue
        ? { ...existingValue, [field]: value }
        : { flightWeekId: weekId, plannedPoints: null, plannedImpressions: null, plannedCost: 0, [field]: value };

      // Calculate cost - for digital use CPM, for linear use a placeholder (needs CPP from market)
      if (value !== null) {
        if (isDigital) {
          const cpm = lineItem.cpm || 10; // fallback CPM
          updatedValue.plannedCost = (value / 1000) * cpm;
        } else {
          // Linear: cost = points * CPP (use placeholder for now, market CPP should be used)
          updatedValue.plannedCost = value * 100;
        }
      } else {
        updatedValue.plannedCost = 0;
      }

      const updated = [...lineItems];
      const weekValues = [...updated[rowIndex].weekValues];
      const wvIdx = weekValues.findIndex((wv) => wv.flightWeekId === weekId);
      if (wvIdx >= 0) {
        weekValues[wvIdx] = updatedValue;
      } else {
        weekValues.push(updatedValue);
      }
      updated[rowIndex] = { ...updated[rowIndex], weekValues };
      setLineItems(updated);

      // Save to server
      try {
        await fetch(
          `/api/plans/${planId}/sections/${sectionId}/line-items/${lineItem.id}/week-values`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ weekValues: [updatedValue] }),
          }
        );
      } catch {
        console.error("Failed to save cell value");
      }
    },
    [lineItems, planId, sectionId, isDigital]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, row: number, col: number) => {
      let newRow = row, newCol = col;
      switch (e.key) {
        case "ArrowUp": newRow = Math.max(0, row - 1); e.preventDefault(); break;
        case "ArrowDown": newRow = Math.min(lineItems.length - 1, row + 1); e.preventDefault(); break;
        case "ArrowLeft": newCol = Math.max(0, col - 1); e.preventDefault(); break;
        case "ArrowRight":
        case "Tab":
          newCol = Math.min(flightWeeks.length - 1, col + 1);
          if (e.key === "Tab") e.preventDefault();
          break;
        case "Enter": newRow = Math.min(lineItems.length - 1, row + 1); e.preventDefault(); break;
        default: return;
      }
      setActiveCell({ row: newRow, col: newCol });
      const input = document.getElementById(`${sectionId}-cell-${newRow}-${newCol}`)?.querySelector("input");
      if (input) (input as HTMLInputElement).focus();
    },
    [lineItems.length, flightWeeks.length, sectionId]
  );

  // Totals
  const getRowTotal = (li: LineItem) => li.weekValues.reduce((s, wv) => s + (wv.plannedCost || 0), 0);
  const sectionTotal = lineItems.reduce((s, li) => s + getRowTotal(li), 0);
  const clientGross = commissionPct < 1 ? sectionTotal / (1 - commissionPct) : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Section header — always visible, click to collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-sm font-semibold text-gray-900">{sectionName}</span>
          <span className="text-xs text-gray-400">
            {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {sectionTotal > 0 && (
            <>
              <span className="text-gray-500">
                Net: <span className="font-medium text-gray-700">${sectionTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </span>
              <span className="text-gray-500">
                Gross: <span className="font-medium text-sage-700">${clientGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </span>
            </>
          )}
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-sage-200 border-t-sage-500" />
            </div>
          ) : (
            <>
              {/* Grid */}
              {lineItems.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead>
                      <tr className="bg-gray-50/80">
                        <th className="sticky left-0 z-10 bg-gray-50/80 px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 w-52">
                          {isDigital ? "Tactic" : "Market / Line Item"}
                        </th>
                        {isDigital && (
                          <th className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400 w-20">
                            CPM
                          </th>
                        )}
                        {flightWeeks.map((week) => (
                          <th
                            key={week.id}
                            className={`px-1 py-1.5 text-center text-[10px] font-medium text-gray-400 min-w-[80px] ${
                              week.isLocked ? "bg-gray-100/80" : ""
                            }`}
                          >
                            <div className="font-semibold">W{week.weekNumber}</div>
                            <div className="font-normal text-[9px]">{week.label}</div>
                          </th>
                        ))}
                        <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400 w-24">
                          Total
                        </th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lineItems.map((li, rowIndex) => {
                        const rowTotal = getRowTotal(li);
                        return (
                          <tr key={li.id} className="group hover:bg-blue-50/30 transition-colors">
                            <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/30 px-3 py-0.5">
                              <input
                                type="text"
                                value={li.tacticName}
                                onChange={(e) => updateLineItemName(rowIndex, e.target.value)}
                                className="w-full border-0 bg-transparent px-0 py-1 text-xs font-medium text-gray-800 focus:outline-none focus:ring-0 placeholder:text-gray-300"
                                placeholder={isDigital ? "Tactic name..." : "Market / line item..."}
                              />
                            </td>
                            {isDigital && (
                              <td className="px-2 py-0.5 text-center">
                                <input
                                  type="number"
                                  value={li.cpm ?? ""}
                                  onChange={(e) => {
                                    const updated = [...lineItems];
                                    updated[rowIndex] = { ...updated[rowIndex], cpm: parseFloat(e.target.value) || 0 };
                                    setLineItems(updated);
                                  }}
                                  className="w-full border-0 bg-transparent px-0 py-1 text-center text-xs tabular-nums text-gray-600 focus:outline-none focus:ring-0"
                                  placeholder="$0"
                                  step="0.01"
                                />
                              </td>
                            )}
                            {flightWeeks.map((week, colIndex) => {
                              const wv = li.weekValues.find((v) => v.flightWeekId === week.id);
                              const value = isDigital ? wv?.plannedImpressions : wv?.plannedPoints;
                              const isActive = activeCell?.row === rowIndex && activeCell?.col === colIndex;
                              return (
                                <td
                                  key={week.id}
                                  id={`${sectionId}-cell-${rowIndex}-${colIndex}`}
                                  className={`px-0.5 py-0.5 ${
                                    week.isLocked ? "bg-gray-50 text-gray-400" : isActive ? "ring-2 ring-inset ring-sage-400" : ""
                                  }`}
                                >
                                  <input
                                    type="number"
                                    value={value ?? ""}
                                    onChange={(e) => updateCellValue(rowIndex, week.id, e.target.value)}
                                    onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
                                    onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                                    disabled={week.isLocked}
                                    className="w-full border-0 bg-transparent px-1 py-1 text-center text-xs tabular-nums focus:outline-none focus:ring-0 placeholder:text-gray-200"
                                    placeholder={isDigital ? "imps" : "pts"}
                                  />
                                </td>
                              );
                            })}
                            <td className="px-2 py-0.5 text-right text-xs font-medium tabular-nums text-gray-700">
                              {rowTotal > 0 ? `$${rowTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}
                            </td>
                            <td className="px-1 py-0.5">
                              <button
                                onClick={() => deleteLineItem(li.id)}
                                className="rounded p-0.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Section totals footer */}
                    {lineItems.length > 0 && sectionTotal > 0 && (
                      <tfoot>
                        <tr className="bg-gray-50/80 border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-gray-50/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                            Section Total
                          </td>
                          {isDigital && <td />}
                          {flightWeeks.map((week) => {
                            const wkTotal = lineItems.reduce((s, li) => {
                              const wv = li.weekValues.find((v) => v.flightWeekId === week.id);
                              return s + (wv?.plannedCost || 0);
                            }, 0);
                            return (
                              <td key={week.id} className="px-1 py-1.5 text-center text-[10px] tabular-nums font-medium text-gray-500">
                                {wkTotal > 0 ? `$${wkTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ""}
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 text-right text-xs font-bold tabular-nums text-sage-700">
                            ${sectionTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* Empty state + add buttons */}
              <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-50">
                {isDigital ? (
                  <>
                    <div className="relative flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-sage-600 hover:text-sage-700 hover:bg-sage-50"
                        onClick={() => setShowTacticPicker(!showTacticPicker)}
                      >
                        <Search className="mr-1.5 h-3 w-3" />
                        Add Tactic from DB
                      </Button>

                      {showTacticPicker && (
                        <div className="absolute bottom-full left-0 mb-1 w-96 rounded-lg border border-gray-200 bg-white p-3 shadow-xl z-20">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                            <Input
                              autoFocus
                              placeholder="Search tactics (e.g. Trade Desk, YouTube, Meta)..."
                              value={tacticSearch}
                              onChange={(e) => setTacticSearch(e.target.value)}
                              className="h-8 pl-8 text-xs"
                            />
                          </div>
                          <div className="mt-2 max-h-60 overflow-auto">
                            {searchingTactics && (
                              <p className="py-3 text-center text-xs text-gray-400">Searching...</p>
                            )}
                            {!searchingTactics && tacticSearch.length >= 2 && tacticResults.length === 0 && (
                              <p className="py-3 text-center text-xs text-gray-400">No tactics found</p>
                            )}
                            {tacticResults.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => addLineItemFromTactic(t)}
                                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-sage-50"
                              >
                                <div>
                                  <div className="text-xs font-medium text-gray-800">{t.displayName}</div>
                                  <div className="text-[10px] text-gray-400">
                                    {t.platformType} {t.adLength ? `· ${t.adLength}` : ""}
                                  </div>
                                </div>
                                <span className="text-xs font-medium text-sage-600">
                                  ${t.cpm.toFixed(2)}
                                </span>
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => { setShowTacticPicker(false); setTacticSearch(""); }}
                            className="mt-2 w-full text-center text-[10px] text-gray-400 hover:text-gray-600"
                          >
                            Close
                          </button>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-gray-500 hover:text-gray-700"
                      onClick={addBlankLineItem}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Blank Row
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-sage-600 hover:text-sage-700 hover:bg-sage-50"
                        onClick={() => setShowMarketPicker(!showMarketPicker)}
                      >
                        <MapPin className="mr-1.5 h-3 w-3" />
                        Add Market
                      </Button>

                      {showMarketPicker && markets.length > 0 && (
                        <div className="absolute bottom-full left-0 mb-1 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-xl z-20">
                          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                            Plan Markets
                          </p>
                          {markets.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => addLineItemFromMarket(m)}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-left hover:bg-sage-50"
                            >
                              <MapPin className="h-3 w-3 text-sage-500" />
                              {m.name}
                            </button>
                          ))}
                          <button
                            onClick={() => setShowMarketPicker(false)}
                            className="mt-1 w-full text-center text-[10px] text-gray-400 hover:text-gray-600"
                          >
                            Close
                          </button>
                        </div>
                      )}
                      {showMarketPicker && markets.length === 0 && (
                        <div className="absolute bottom-full left-0 mb-1 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-xl z-20">
                          <p className="text-xs text-gray-500">
                            No markets added yet. Add markets in Plan Settings.
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-gray-500 hover:text-gray-700"
                      onClick={addBlankLineItem}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Blank Row
                    </Button>
                  </>
                )}
              </div>

              {/* Empty state message */}
              {lineItems.length === 0 && !loading && (
                <div className="flex flex-col items-center py-6 text-center">
                  {isDigital ? (
                    <Tv className="h-6 w-6 text-gray-300" />
                  ) : (
                    <MapPin className="h-6 w-6 text-gray-300" />
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    {isDigital
                      ? "Search and add tactics from the digital inventory database"
                      : "Add markets from your plan to start building line items"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

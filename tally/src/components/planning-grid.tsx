"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface FlightWeek {
  id: string;
  weekNumber: number;
  label: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
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
}

interface PlanningGridProps {
  planId: string;
  sectionId: string;
  sectionType: string;
  sectionName: string;
  flightWeeks: FlightWeek[];
  markets: Array<{ id: string; name: string }>;
  commissionPct: number;
}

const isDigitalSection = (type: string) =>
  ["DIGITAL_OTT", "DISPLAY", "STREAMING"].includes(type);

export function PlanningGrid({
  planId,
  sectionId,
  sectionType,
  sectionName,
  flightWeeks,
  markets,
  commissionPct,
}: PlanningGridProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCell, setActiveCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const digital = isDigitalSection(sectionType);

  const sortedWeeks = [...flightWeeks].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  // Fetch line items for this section
  useEffect(() => {
    async function fetchLineItems() {
      try {
        const res = await fetch(
          `/api/plans/${planId}/sections/${sectionId}/line-items`
        );
        if (res.ok) {
          const data = await res.json();
          setLineItems(data);
        }
      } catch {
        console.error("Failed to fetch line items");
      } finally {
        setLoading(false);
      }
    }
    fetchLineItems();
  }, [planId, sectionId]);

  // Add a new line item
  const addLineItem = async () => {
    try {
      const res = await fetch(
        `/api/plans/${planId}/sections/${sectionId}/line-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tacticName: "New Line Item",
            marketId: markets[0]?.id || null,
          }),
        }
      );
      if (res.ok) {
        const newItem = await res.json();
        setLineItems([...lineItems, newItem]);
      }
    } catch {
      console.error("Failed to add line item");
    }
  };

  // Delete a line item
  const deleteLineItem = async (lineItemId: string) => {
    try {
      await fetch(
        `/api/plans/${planId}/sections/${sectionId}/line-items/${lineItemId}`,
        { method: "DELETE" }
      );
      setLineItems(lineItems.filter((li) => li.id !== lineItemId));
    } catch {
      console.error("Failed to delete line item");
    }
  };

  // Update a cell value
  const updateCellValue = useCallback(
    async (
      lineItemIndex: number,
      weekId: string,
      value: number | null,
      field: "plannedPoints" | "plannedImpressions"
    ) => {
      const lineItem = lineItems[lineItemIndex];
      const existingValue = lineItem.weekValues.find(
        (wv) => wv.flightWeekId === weekId
      );

      const updatedValue: WeekValue = existingValue
        ? { ...existingValue, [field]: value }
        : { flightWeekId: weekId, plannedPoints: null, plannedImpressions: null, plannedCost: 0, [field]: value };

      // Calculate cost
      // For now, use a simple placeholder - real calculation depends on CPP/CPM data
      updatedValue.plannedCost = value ? value * (digital ? 0.05 : 100) : 0;

      const updatedLineItems = [...lineItems];
      const weekValues = [...updatedLineItems[lineItemIndex].weekValues];
      const wvIndex = weekValues.findIndex((wv) => wv.flightWeekId === weekId);
      if (wvIndex >= 0) {
        weekValues[wvIndex] = updatedValue;
      } else {
        weekValues.push(updatedValue);
      }
      updatedLineItems[lineItemIndex] = {
        ...updatedLineItems[lineItemIndex],
        weekValues,
      };
      setLineItems(updatedLineItems);

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
    [lineItems, planId, sectionId, digital]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, row: number, col: number) => {
      let newRow = row;
      let newCol = col;

      switch (e.key) {
        case "ArrowUp":
          newRow = Math.max(0, row - 1);
          e.preventDefault();
          break;
        case "ArrowDown":
          newRow = Math.min(lineItems.length - 1, row + 1);
          e.preventDefault();
          break;
        case "ArrowLeft":
          newCol = Math.max(0, col - 1);
          e.preventDefault();
          break;
        case "ArrowRight":
        case "Tab":
          newCol = Math.min(sortedWeeks.length - 1, col + 1);
          if (e.key === "Tab") e.preventDefault();
          break;
        case "Enter":
          newRow = Math.min(lineItems.length - 1, row + 1);
          e.preventDefault();
          break;
        default:
          return;
      }

      setActiveCell({ row: newRow, col: newCol });
      const cellId = `cell-${newRow}-${newCol}`;
      const cell = document.getElementById(cellId);
      if (cell) {
        const input = cell.querySelector("input");
        if (input) input.focus();
      }
    },
    [lineItems.length, sortedWeeks.length]
  );

  // Calculate row total
  const getRowTotal = (lineItem: LineItem) => {
    return lineItem.weekValues.reduce((sum, wv) => sum + (wv.plannedCost || 0), 0);
  };

  // Calculate section total
  const sectionTotal = lineItems.reduce(
    (sum, li) => sum + getRowTotal(li),
    0
  );

  // Calculate client gross
  const clientGross =
    commissionPct < 1 ? sectionTotal / (1 - commissionPct) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sage-200 border-t-sage-500" />
      </div>
    );
  }

  return (
    <div ref={gridRef} className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{sectionName}</h3>
          <p className="text-xs text-gray-500">
            {lineItems.length} line item{lineItems.length !== 1 ? "s" : ""} |
            Net: ${sectionTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |
            Client Gross: ${clientGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <Button onClick={addLineItem} variant="outline" size="sm">
          <Plus className="mr-1 h-3 w-3" />
          Add Line Item
        </Button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 w-48">
                {digital ? "Tactic" : "Line Item"}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 w-28">
                Market
              </th>
              {sortedWeeks.map((week) => (
                <th
                  key={week.id}
                  className={`px-2 py-2 text-center text-xs font-medium text-gray-500 min-w-[90px] ${
                    week.isLocked ? "bg-gray-100" : ""
                  }`}
                >
                  <div className="font-semibold">Wk {week.weekNumber}</div>
                  <div className="text-[10px] font-normal">{week.label}</div>
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 w-28">
                Total
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {lineItems.length === 0 && (
              <tr>
                <td
                  colSpan={sortedWeeks.length + 4}
                  className="px-3 py-8 text-center text-sm text-gray-400"
                >
                  No line items yet. Click &quot;Add Line Item&quot; to start.
                </td>
              </tr>
            )}
            {lineItems.map((lineItem, rowIndex) => {
              const rowTotal = getRowTotal(lineItem);
              return (
                <tr
                  key={lineItem.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
                    <input
                      type="text"
                      value={lineItem.tacticName}
                      onChange={(e) => {
                        const updated = [...lineItems];
                        updated[rowIndex] = {
                          ...updated[rowIndex],
                          tacticName: e.target.value,
                        };
                        setLineItems(updated);
                      }}
                      className="w-full border-0 bg-transparent px-0 py-1 text-sm focus:outline-none focus:ring-0"
                      placeholder="Enter name..."
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <select
                      value={lineItem.marketId || ""}
                      onChange={(e) => {
                        const updated = [...lineItems];
                        updated[rowIndex] = {
                          ...updated[rowIndex],
                          marketId: e.target.value || null,
                        };
                        setLineItems(updated);
                      }}
                      className="w-full border-0 bg-transparent py-1 text-xs focus:outline-none focus:ring-0"
                    >
                      <option value="">All</option>
                      {markets.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  {sortedWeeks.map((week, colIndex) => {
                    const weekValue = lineItem.weekValues.find(
                      (wv) => wv.flightWeekId === week.id
                    );
                    const value = digital
                      ? weekValue?.plannedImpressions
                      : weekValue?.plannedPoints;
                    const isActive =
                      activeCell?.row === rowIndex &&
                      activeCell?.col === colIndex;

                    return (
                      <td
                        key={week.id}
                        id={`cell-${rowIndex}-${colIndex}`}
                        className={`px-1 py-1 ${
                          week.isLocked
                            ? "bg-gray-50 text-gray-400"
                            : isActive
                            ? "ring-2 ring-inset ring-sage-500"
                            : ""
                        }`}
                      >
                        <input
                          type="number"
                          value={value ?? ""}
                          onChange={(e) => {
                            const numVal = e.target.value
                              ? parseFloat(e.target.value)
                              : null;
                            updateCellValue(
                              rowIndex,
                              week.id,
                              numVal,
                              digital
                                ? "plannedImpressions"
                                : "plannedPoints"
                            );
                          }}
                          onFocus={() =>
                            setActiveCell({ row: rowIndex, col: colIndex })
                          }
                          onKeyDown={(e) =>
                            handleKeyDown(e, rowIndex, colIndex)
                          }
                          disabled={week.isLocked}
                          className="w-full border-0 bg-transparent px-1 py-1 text-center text-xs tabular-nums focus:outline-none focus:ring-0"
                          placeholder={digital ? "imps" : "pts"}
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-right text-xs font-medium tabular-nums text-gray-700">
                    ${rowTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-1 py-1.5">
                    <button
                      onClick={() => deleteLineItem(lineItem.id)}
                      className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {lineItems.length > 0 && (
            <tfoot className="bg-sage-50/50">
              <tr className="font-medium">
                <td className="sticky left-0 z-10 bg-sage-50/50 px-3 py-2 text-xs text-gray-700">
                  Section Total
                </td>
                <td />
                {sortedWeeks.map((week) => {
                  const weekTotal = lineItems.reduce((sum, li) => {
                    const wv = li.weekValues.find(
                      (v) => v.flightWeekId === week.id
                    );
                    return sum + (wv?.plannedCost || 0);
                  }, 0);
                  return (
                    <td
                      key={week.id}
                      className="px-1 py-2 text-center text-xs tabular-nums text-gray-600"
                    >
                      {weekTotal > 0
                        ? `$${weekTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : "-"}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right text-xs font-bold tabular-nums text-sage-700">
                  ${sectionTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

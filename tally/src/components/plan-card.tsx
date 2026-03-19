"use client";

import { format } from "date-fns";

interface PlanCardProps {
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

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-sage-100 text-sage-700",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
};

const clientTypeLabels: Record<string, string> = {
  CANDIDATE: "Candidate",
  ISSUE_ADVOCACY: "Issue Advocacy",
  PAC: "PAC",
};

export function PlanCard({
  clientName,
  clientType,
  status,
  startDate,
  endDate,
  flightLengthDays,
  flightLengthWeeks,
  electionType,
}: PlanCardProps) {
  return (
    <div className="group rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-sage-300 hover:shadow-md cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-gray-900 group-hover:text-sage-600">
            {clientName}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {clientTypeLabels[clientType]}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">{electionType === "PRIMARY" ? "Primary" : "General"}</span>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}
        >
          {statusLabels[status]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Start</p>
          <p className="mt-0.5 text-sm text-gray-700">
            {format(new Date(startDate), "MMM d, yyyy")}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">End</p>
          <p className="mt-0.5 text-sm text-gray-700">
            {format(new Date(endDate), "MMM d, yyyy")}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Flight</p>
          <p className="mt-0.5 text-sm text-gray-700">
            {flightLengthDays}D / {flightLengthWeeks}W
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { format } from "date-fns";

interface PlanHeaderProps {
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
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  IN_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-sage-50 text-sage-700 border-sage-200",
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

export function PlanHeader({
  clientName,
  clientType,
  status,
  startDate,
  endDate,
  windowDate,
  flightLengthDays,
  flightLengthWeeks,
  electionType,
  commissionPct,
}: PlanHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {clientName}
              </h1>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}
              >
                {statusLabels[status]}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <span>{clientTypeLabels[clientType]}</span>
              <span className="text-gray-300">|</span>
              <span>{electionType === "PRIMARY" ? "Primary" : "General"} Election</span>
              <span className="text-gray-300">|</span>
              <span>{(commissionPct * 100).toFixed(0)}% Commission</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-md bg-gray-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Start Date
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {format(new Date(startDate), "MMM d, yyyy")}
            </p>
          </div>
          <div className="rounded-md bg-gray-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              End Date
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {format(new Date(endDate), "MMM d, yyyy")}
            </p>
          </div>
          <div className="rounded-md bg-gray-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Window Date
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {format(new Date(windowDate), "MMM d, yyyy")}
            </p>
          </div>
          <div className="rounded-md bg-gray-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Flight Length
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {flightLengthDays}D / {flightLengthWeeks}W
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

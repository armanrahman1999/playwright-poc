"use client";

/**
 * UI Validation Results Component
 * 
 * Displays detailed validation test results
 * Shows pass/fail status, execution times, and specific failures
 */

import { UIValidationReport, ValidationResult } from "@/lib/validation/types";

interface ValidationResultsProps {
  report: UIValidationReport;
}

export default function ValidationResults({ report }: ValidationResultsProps) {
  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <p className="text-xs text-blue-600 font-semibold">Total Tests</p>
          <p className="text-2xl font-bold text-blue-900">{report.totalTests}</p>
        </div>
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <p className="text-xs text-green-600 font-semibold">Passed</p>
          <p className="text-2xl font-bold text-green-900">{report.passedTests}</p>
        </div>
        <div className="bg-red-50 p-3 rounded border border-red-200">
          <p className="text-xs text-red-600 font-semibold">Failed</p>
          <p className="text-2xl font-bold text-red-900">{report.failedTests}</p>
        </div>
        <div
          className={`p-3 rounded border ${
            report.criticalFailures === 0
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <p
            className={`text-xs font-semibold ${
              report.criticalFailures === 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            Critical
          </p>
          <p
            className={`text-2xl font-bold ${
              report.criticalFailures === 0 ? "text-green-900" : "text-red-900"
            }`}
          >
            {report.criticalFailures}
          </p>
        </div>
      </div>

      {/* Overall Status */}
      <div
        className={`p-4 rounded border-l-4 ${
          report.overallPassed
            ? "bg-green-50 border-l-green-500 text-green-900"
            : "bg-red-50 border-l-red-500 text-red-900"
        }`}
      >
        <p className="font-semibold flex items-center gap-2">
          {report.overallPassed ? "✓ All Tests Passed" : "✗ Some Tests Failed"}
        </p>
        <p className="text-sm mt-1">Completed in {(report.duration / 1000).toFixed(2)}s</p>
      </div>

      {/* Individual Test Results */}
      <div>
        <h3 className="font-semibold text-sm text-gray-700 mb-2">Test Results</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {report.results.map((result, idx) => (
            <TestResultItem key={idx} result={result} />
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-500 border-t pt-2">
        <p>Executed: {new Date(report.timestamp).toLocaleString()}</p>
      </div>
    </div>
  );
}

/**
 * Individual test result item
 */
function TestResultItem({ result }: { result: ValidationResult }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div
      className={`p-3 rounded border ${
        result.passed
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left flex items-start gap-2 hover:opacity-75 transition"
      >
        <span className="mt-0.5 text-lg">
          {result.passed ? "✓" : "✗"}
        </span>
        <div className="flex-1">
          <p
            className={`text-sm font-semibold ${
              result.passed ? "text-green-900" : "text-red-900"
            }`}
          >
            {result.testName}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {result.duration}ms {isExpanded ? "▼" : "▶"}
          </p>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
          <p className="text-gray-600 mb-2">
            <span className="font-semibold">ID:</span> {result.testId}
          </p>
          {result.error && (
            <p className="text-red-700 mb-2 font-mono bg-red-100 p-2 rounded">
              {result.error}
            </p>
          )}
          {result.expected !== undefined && (
            <p className="text-gray-600 mb-1">
              <span className="font-semibold">Expected:</span> {String(result.expected)}
            </p>
          )}
          {result.actual !== undefined && (
            <p className="text-gray-600">
              <span className="font-semibold">Actual:</span> {String(result.actual)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import React from "react";

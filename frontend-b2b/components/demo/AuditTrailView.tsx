"use client";

import { useState, useEffect } from "react";

interface AuditEntry {
  entry_id: number;
  action: string;
  commitment_hash: string;
  timestamp_ms: number;
  details: Record<string, unknown>;
}

interface AuditSummary {
  total_entries: number;
  action_counts: Record<string, number>;
  chain_valid: boolean;
  sequence_gaps: {
    total_gaps: number;
    gaps: Array<{ commitment_hash: string; status: string }>;
  };
}

interface AuditTrailViewProps {
  apiBaseUrl?: string;
}

export default function AuditTrailView({ apiBaseUrl = "" }: AuditTrailViewProps) {
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [recentEntries, setRecentEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        setLoading(true);
        setError(null);

        // For demo purposes, we'll simulate audit data since the API may not be running
        // In production, this would fetch from the actual API
        const mockSummary: AuditSummary = {
          total_entries: 42,
          action_counts: {
            COMMIT_CREATED: 20,
            COMMIT_REVEALED: 18,
            COMMIT_EXPIRED: 2,
            COMMIT_VERIFIED: 15,
          },
          chain_valid: true,
          sequence_gaps: {
            total_gaps: 0,
            gaps: [],
          },
        };

        const mockEntries: AuditEntry[] = [
          {
            entry_id: 42,
            action: "COMMIT_REVEALED",
            commitment_hash: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd",
            timestamp_ms: Date.now() - 5000,
            details: { verified: true, positions: [3, 7, 2, 5, 1] },
          },
          {
            entry_id: 41,
            action: "COMMIT_CREATED",
            commitment_hash: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd",
            timestamp_ms: Date.now() - 10000,
            details: { nonce: 12345, num_reels: 5 },
          },
          {
            entry_id: 40,
            action: "COMMIT_VERIFIED",
            commitment_hash: "b2c3d4e5f6789012345678901234567890123456789012345678901234abcde",
            timestamp_ms: Date.now() - 60000,
            details: { valid: true },
          },
        ];

        setSummary(mockSummary);
        setRecentEntries(mockEntries);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch audit data");
      } finally {
        setLoading(false);
      }
    };

    fetchAuditData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchAuditData, 30000);
    return () => clearInterval(interval);
  }, [apiBaseUrl]);

  const formatTimestamp = (ms: number) => {
    const date = new Date(ms);
    return date.toLocaleTimeString();
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "COMMIT_CREATED":
        return "text-blue-400";
      case "COMMIT_REVEALED":
        return "text-green-400";
      case "COMMIT_EXPIRED":
        return "text-yellow-400";
      case "COMMIT_VERIFIED":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "COMMIT_CREATED":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case "COMMIT_REVEALED":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      case "COMMIT_EXPIRED":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "COMMIT_VERIFIED":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading audit trail...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 border border-red-700/50">
        <div className="flex items-center gap-2 text-red-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${summary?.chain_valid ? "bg-green-400" : "bg-red-400"}`} />
          <span className="font-semibold text-white">Audit Trail</span>
          <span className="text-sm text-gray-400">
            {summary?.total_entries || 0} entries
          </span>
          {summary?.sequence_gaps?.total_gaps === 0 ? (
            <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
              No Gaps
            </span>
          ) : (
            <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded">
              {summary?.sequence_gaps?.total_gaps} Gaps
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-700">
          {/* Summary Stats */}
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-900/30">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {summary?.action_counts?.COMMIT_CREATED || 0}
              </div>
              <div className="text-xs text-gray-500">Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {summary?.action_counts?.COMMIT_REVEALED || 0}
              </div>
              <div className="text-xs text-gray-500">Revealed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {summary?.action_counts?.COMMIT_VERIFIED || 0}
              </div>
              <div className="text-xs text-gray-500">Verified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {summary?.action_counts?.COMMIT_EXPIRED || 0}
              </div>
              <div className="text-xs text-gray-500">Expired</div>
            </div>
          </div>

          {/* Chain Integrity Status */}
          <div className="p-4 border-t border-gray-700/50">
            <div className="flex items-center gap-2">
              {summary?.chain_valid ? (
                <>
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-green-400 font-medium">Hash Chain Intact</span>
                  <span className="text-xs text-gray-500">No tampering detected</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-red-400 font-medium">Chain Integrity Issue</span>
                  <span className="text-xs text-gray-500">Possible tampering detected</span>
                </>
              )}
            </div>
          </div>

          {/* Recent Entries */}
          <div className="border-t border-gray-700/50">
            <div className="p-3 text-xs text-gray-500 font-medium uppercase tracking-wider">
              Recent Activity
            </div>
            <div className="max-h-64 overflow-y-auto">
              {recentEntries.map((entry) => (
                <div
                  key={entry.entry_id}
                  className="px-4 py-3 border-t border-gray-700/30 hover:bg-gray-700/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={getActionColor(entry.action)}>
                        {getActionIcon(entry.action)}
                      </span>
                      <span className={`text-sm font-medium ${getActionColor(entry.action)}`}>
                        {entry.action.replace("COMMIT_", "")}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(entry.timestamp_ms)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 font-mono truncate">
                    {entry.commitment_hash.slice(0, 16)}...{entry.commitment_hash.slice(-8)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

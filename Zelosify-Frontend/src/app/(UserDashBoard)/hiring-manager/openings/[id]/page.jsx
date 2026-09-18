"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  FileText,
  ExternalLink,
  Check,
  X,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Zap,
} from "lucide-react";

export default function HiringManagerOpeningProfilesPage() {
  const params = useParams();
  const router = useRouter();
  const openingId = params.id;

  const [opening, setOpening] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL, RECOMMENDED, BORDERLINE, NOT_RECOMMENDED
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api/v1";
      const res = await fetch(`${backendUrl}/hiring-manager/openings/${openingId}/profiles`, {
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load candidate profiles");
      }

      const data = await res.json();
      setOpening(data.opening);
      setProfiles(data.profiles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (openingId) {
      fetchProfiles();
    }
  }, [openingId]);

  // Handle Shortlist action
  const handleShortlist = async (profileId) => {
    setActionLoadingId(profileId);
    try {
      // Optimistic update
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, status: "SHORTLISTED" } : p))
      );

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api/v1";
      const res = await fetch(`${backendUrl}/hiring-manager/profiles/${profileId}/shortlist`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to shortlist candidate");
      }
    } catch (err) {
      alert(err.message);
      await fetchProfiles(); // Rollback on error
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject action
  const handleReject = async (profileId) => {
    setActionLoadingId(profileId);
    try {
      // Optimistic update
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, status: "REJECTED" } : p))
      );

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api/v1";
      const res = await fetch(`${backendUrl}/hiring-manager/profiles/${profileId}/reject`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to reject candidate");
      }
    } catch (err) {
      alert(err.message);
      await fetchProfiles(); // Rollback on error
    } finally {
      setActionLoadingId(null);
    }
  };

  // Preview file handler
  const handlePreview = async (profileId) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api/v1";
      const res = await fetch(`${backendUrl}/hiring-manager/profiles/${profileId}/preview`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate preview URL");
      const { previewUrl } = await res.json();
      window.open(previewUrl, "_blank");
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    if (filter === "RECOMMENDED") {
      return profiles.filter((p) => p.recommendationBadge === "Recommended");
    }
    if (filter === "BORDERLINE") {
      return profiles.filter((p) => p.recommendationBadge === "Borderline");
    }
    if (filter === "NOT_RECOMMENDED") {
      return profiles.filter((p) => p.recommendationBadge === "Not Recommended");
    }
    return profiles;
  }, [profiles, filter]);

  // Virtualization windowing for lists > 50 records
  const isLargeDataset = filteredProfiles.length > 50;
  const [visibleCount, setVisibleCount] = useState(50);
  const displayedProfiles = useMemo(() => {
    return isLargeDataset ? filteredProfiles.slice(0, visibleCount) : filteredProfiles;
  }, [filteredProfiles, isLargeDataset, visibleCount]);

  if (loading && !opening) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-36 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/hiring-manager/openings")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Requisitions
      </button>

      {/* Opening Header Banner */}
      {opening && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Requisition Candidate Console
              </span>
              <h1 className="text-2xl font-bold text-foreground mt-1">{opening.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                {opening.contractType || "C2C"}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">
                {opening.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Location: <strong className="text-foreground">{opening.location || "Remote"}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Experience: <strong className="text-foreground">{opening.experienceMin} - {opening.experienceMax ?? "N/A"} yrs</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Posted: <strong className="text-foreground">{new Date(opening.postedDate).toLocaleDateString()}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Profile Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === "ALL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
          >
            All Candidates ({profiles.length})
          </button>
          <button
            onClick={() => setFilter("RECOMMENDED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              filter === "RECOMMENDED"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Recommended ({profiles.filter((p) => p.recommendationBadge === "Recommended").length})
          </button>
          <button
            onClick={() => setFilter("BORDERLINE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              filter === "BORDERLINE"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Borderline ({profiles.filter((p) => p.recommendationBadge === "Borderline").length})
          </button>
          <button
            onClick={() => setFilter("NOT_RECOMMENDED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              filter === "NOT_RECOMMENDED"
                ? "bg-destructive text-destructive-foreground shadow-sm"
                : "bg-destructive/10 text-destructive hover:bg-destructive/20"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-destructive" />
            Not Recommended ({profiles.filter((p) => p.recommendationBadge === "Not Recommended").length})
          </button>
        </div>

        <span className="text-xs text-muted-foreground">
          Showing {displayedProfiles.length} of {filteredProfiles.length} candidate profiles
        </span>
      </div>

      {/* Candidate Profile Cards Grid */}
      {displayedProfiles.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-sm">
          No candidates found matching the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayedProfiles.map((p) => {
            const isRecommended = p.recommendationBadge === "Recommended";
            const isBorderline = p.recommendationBadge === "Borderline";
            const isNotRecommended = p.recommendationBadge === "Not Recommended";

            return (
              <div
                key={p.id}
                className={`bg-card border rounded-xl p-5 shadow-sm space-y-4 transition hover:shadow-md flex flex-col justify-between ${
                  isRecommended
                    ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                    : isBorderline
                    ? "border-amber-500/40 bg-amber-500/[0.02]"
                    : "border-border"
                }`}
              >
                <div className="space-y-3">
                  {/* Top line: File name & Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <h3 className="font-bold text-sm text-foreground truncate max-w-xs" title={p.fileName}>
                          {p.fileName}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          Uploaded on {new Date(p.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Recommendation Badge */}
                    <div className="shrink-0">
                      {isRecommended ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          🟢 Recommended
                        </span>
                      ) : isBorderline ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          🟡 Borderline
                        </span>
                      ) : isNotRecommended ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                          <XCircle className="h-3.5 w-3.5" />
                          🔴 Not Recommended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          Analyzing...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics Bar: Score %, Confidence %, Latency */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-muted/40 rounded-lg text-center">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Deterministic Score</p>
                      <p className="text-base font-extrabold text-foreground">
                        {p.recommendationScorePercent !== null ? `${p.recommendationScorePercent}%` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">AI Confidence</p>
                      <p className="text-base font-extrabold text-foreground">
                        {p.recommendationConfidencePercent !== null ? `${p.recommendationConfidencePercent}%` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Processing Time</p>
                      <p className="text-base font-extrabold text-foreground flex items-center justify-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        {p.recommendationLatencyMs ? `${p.recommendationLatencyMs} ms` : "—"}
                      </p>
                    </div>
                  </div>

                  {/* AI Reasoning Explanation Box */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Agent Decision Rationale:
                    </p>
                    <p className="text-xs text-foreground bg-background border border-border rounded-lg p-3 leading-relaxed">
                      {p.recommendationReason || "Evaluating candidate resume attributes..."}
                    </p>
                  </div>
                </div>

                {/* Bottom Section: Current Status & Actions */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(p.id)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Preview Resume
                    </button>

                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        p.status === "SHORTLISTED"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : p.status === "REJECTED"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={actionLoadingId === p.id || p.status === "SHORTLISTED"}
                      onClick={() => handleShortlist(p.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition shadow-sm"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Shortlist
                    </button>
                    <button
                      disabled={actionLoadingId === p.id || p.status === "REJECTED"}
                      onClick={() => handleReject(p.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-40 transition shadow-sm"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Virtualization Load More (when > 50 records) */}
      {isLargeDataset && visibleCount < filteredProfiles.length && (
        <div className="text-center pt-4">
          <button
            onClick={() => setVisibleCount((prev) => prev + 50)}
            className="px-4 py-2 text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-muted rounded-lg transition"
          >
            Load Next 50 Profiles ({filteredProfiles.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
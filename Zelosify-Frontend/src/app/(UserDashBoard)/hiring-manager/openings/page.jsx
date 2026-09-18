"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Users,
  MapPin,
  Calendar,
  ChevronRight,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";

export default function HiringManagerOpeningsPage() {
  const router = useRouter();
  const [openings, setOpenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOwnOpenings = async () => {
    setLoading(true);
    setError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api/v1";
      const res = await fetch(`${backendUrl}/hiring-manager/openings`, {
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to load hiring manager openings");
      }

      const data = await res.json();
      setOpenings(data.openings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnOpenings();
  }, []);

  const totalProfiles = openings.reduce((acc, op) => acc + (op.profilesCount || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            Hiring Manager Decision Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your contract requisitions and review AI-evaluated candidate profiles.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-lg">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">My Active Openings</p>
            <p className="text-2xl font-bold text-foreground">{loading ? "..." : openings.length}</p>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Candidate Profiles Submitted</p>
            <p className="text-2xl font-bold text-foreground">{loading ? "..." : totalProfiles}</p>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Decision Support Engine</p>
            <p className="text-xs font-semibold text-emerald-500 mt-1 flex items-center gap-1">
              ● Active & Deterministic
            </p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchOwnOpenings} className="underline font-medium hover:opacity-80">
            Retry
          </button>
        </div>
      )}

      {/* Openings Grid / List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Your Contract Openings</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 bg-card border border-border rounded-xl p-5" />
            ))}
          </div>
        ) : openings.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
            No openings assigned to your account.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openings.map((op) => (
              <div
                key={op.id}
                onClick={() => router.push(`/hiring-manager/openings/${op.id}`)}
                className="bg-card border border-border hover:border-primary/50 hover:shadow-md transition cursor-pointer rounded-xl p-5 space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {op.contractType || "C2C"}
                    </span>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition mt-1">
                      {op.title}
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {op.profilesCount || 0} Candidates
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>{op.location || "Remote"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>Exp: {op.experienceMin} - {op.experienceMax ?? "N/A"} yrs</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Posted on {new Date(op.postedDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Status: <strong className="text-emerald-500 uppercase">{op.status}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Review Candidates
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Search, MapPin, Calendar, User, ChevronRight, ChevronLeft } from "lucide-react";

export default function VendorOpeningsPage() {
  const router = useRouter();
  const [openings, setOpenings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOpenings = async (page = 1, searchQuery = "") => {
    setLoading(true);
    setError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api/v1";
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const res = await fetch(`${backendUrl}/vendor/openings?${params.toString()}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to load contract openings");
      }

      const data = await res.json();
      setOpenings(data.openings || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenings(pagination.page, search);
  }, [pagination.page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOpenings(1, search);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-primary" />
            Contract Openings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse active contract positions under your tenant and submit candidate profiles.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search roles, location, contracts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition shadow-sm"
          >
            Search
          </button>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchOpenings(pagination.page, search)}
            className="underline font-medium hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table & Content */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3.5 px-4">Title</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Contract Type</th>
                <th className="py-3.5 px-4">Experience</th>
                <th className="py-3.5 px-4">Posted Date</th>
                <th className="py-3.5 px-4">Hiring Manager</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-48" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-16" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-28" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-8 bg-muted rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : openings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No contract openings found matching your criteria.
                  </td>
                </tr>
              ) : (
                openings.map((op) => (
                  <tr
                    key={op.id}
                    onClick={() => router.push(`/vendor/openings/${op.id}`)}
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{op.title}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{op.location || "Remote"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {op.contractType || "Contract"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      {op.experienceMin} - {op.experienceMax ?? "N/A"} yrs
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{new Date(op.postedDate).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{op.hiringManagerName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        View & Submit
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-3 px-4 bg-muted/20 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Showing Page {pagination.page} of {pagination.totalPages || 1} ({pagination.total} total openings)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="p-1.5 rounded-md border border-input bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="p-1.5 rounded-md border border-input bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

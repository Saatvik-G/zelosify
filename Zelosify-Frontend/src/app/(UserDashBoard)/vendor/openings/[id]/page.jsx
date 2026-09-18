"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Briefcase,
  MapPin,
  Calendar,
  User,
  ArrowLeft,
  UploadCloud,
  FileText,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

export default function VendorOpeningDetailPage() {
  const params = useParams();
  const router = useRouter();
  const openingId = params.id;

  const [opening, setOpening] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // File Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const fileInputRef = useRef(null);

  const fetchOpeningData = async () => {
    setLoading(true);
    setError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api/v1";
      const res = await fetch(`${backendUrl}/vendor/openings/${openingId}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to load opening details");
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
      fetchOpeningData();
    }
  }, [openingId]);

  // Handle files selected via input or drag-drop
  const handleFiles = (selectedFiles) => {
    const validFiles = Array.from(selectedFiles).filter((f) => {
      const name = f.name.toLowerCase();
      return name.endsWith(".pdf") || name.endsWith(".pptx");
    });

    if (validFiles.length < selectedFiles.length) {
      setUploadMessage({
        type: "warn",
        text: "Only PDF and PPTX files are supported.",
      });
    }

    if (validFiles.length > 0) {
      setUploadQueue((prev) => [...prev, ...validFiles]);
    }
  };

  // Presign -> S3 PUT -> Submit Transaction Pipeline
  const handleUploadAll = async () => {
    if (uploadQueue.length === 0 || isUploading) return;
    setIsUploading(true);
    setUploadMessage(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api/v1";
    const uploadedKeys = [];
    const errors = [];

    for (const file of uploadQueue) {
      try {
        // 1. Get presigned upload URL
        const presignRes = await fetch(`${backendUrl}/vendor/openings/${openingId}/profiles/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
          }),
        });

        if (!presignRes.ok) {
          const err = await presignRes.json().catch(() => ({}));
          throw new Error(err.message || `Failed presign for ${file.name}`);
        }

        const { presignedUrl, s3Key } = await presignRes.json();

        // 2. Direct upload to AWS S3 using presigned PUT URL
        const uploadRes = await fetch(presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || (file.name.endsWith(".pptx") ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" : "application/pdf"),
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`S3 upload failed for ${file.name}`);
        }

        uploadedKeys.push(s3Key);
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    // 3. Submit profiles via Prisma Transaction
    if (uploadedKeys.length > 0) {
      try {
        const submitRes = await fetch(`${backendUrl}/vendor/openings/${openingId}/profiles/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ s3Keys: uploadedKeys }),
        });

        if (!submitRes.ok) {
          const err = await submitRes.json().catch(() => ({}));
          throw new Error(err.message || "Failed to register submitted profiles");
        }

        setUploadMessage({
          type: "success",
          text: `Successfully submitted ${uploadedKeys.length} candidate profile(s). AI Recommendation agent triggered!`,
        });
        setUploadQueue([]);
        await fetchOpeningData();
      } catch (err) {
        setUploadMessage({ type: "error", text: err.message });
      }
    } else if (errors.length > 0) {
      setUploadMessage({ type: "error", text: errors.join(", ") });
    }

    setIsUploading(false);
  };

  // Soft delete handler
  const handleDeleteProfile = async (profileId) => {
    if (!confirm("Are you sure you want to delete this candidate profile?")) return;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api/v1";
      const res = await fetch(`${backendUrl}/vendor/profiles/${profileId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete profile");
      }

      // Remove from local state
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    } catch (err) {
      alert(err.message);
    }
  };

  // Preview file handler
  const handlePreviewProfile = async (profileId) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api/v1";
      const res = await fetch(`${backendUrl}/vendor/profiles/${profileId}/preview`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to generate preview URL");
      }

      const { previewUrl } = await res.json();
      window.open(previewUrl, "_blank");
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading && !opening) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-44 bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/vendor/openings")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Openings
      </button>

      {/* Opening Header Card */}
      {opening && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Contract Position Details
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Location: <strong className="text-foreground">{opening.location || "Remote"}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="h-4 w-4 text-primary" />
              <span>Experience: <strong className="text-foreground">{opening.experienceRange}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 text-primary" />
              <span>Manager: <strong className="text-foreground">{opening.hiringManagerName}</strong></span>
            </div>
          </div>

          {opening.description && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {opening.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Candidate Profile Upload Section */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            Upload Candidate Profiles (PDF / PPTX)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Files are stored isolated in tenant storage. S3 presigned URLs are verified prior to ingestion.
          </p>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 bg-background"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.pptx"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            Click to select or drag and drop candidate resumes
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports multiple PDF and PPTX files
          </p>
        </div>

        {/* Upload Message */}
        {uploadMessage && (
          <div
            className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
              uploadMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : uploadMessage.type === "warn"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {uploadMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{uploadMessage.text}</span>
          </div>
        )}

        {/* Selected files queue */}
        {uploadQueue.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Selected Files ({uploadQueue.length})
            </h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {uploadQueue.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium truncate text-foreground">{file.name}</span>
                    <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadQueue((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="text-destructive hover:opacity-80 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                disabled={isUploading}
                onClick={handleUploadAll}
                className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {isUploading ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Uploading & Submitting...
                  </>
                ) : (
                  `Submit ${uploadQueue.length} Candidate Profile(s)`
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Profiles Table for this Vendor */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden space-y-3 p-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Your Submitted Candidates ({profiles.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Profiles submitted by your organization for this contract role. AI scores are exclusively visible to Hiring Managers.
          </p>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Candidate File</th>
                <th className="py-3 px-4">Submitted At</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground text-xs">
                    No candidate profiles submitted yet for this position.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => {
                  const filename = p.s3Key.split("/").pop() || p.s3Key;
                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="truncate max-w-xs">{filename}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {new Date(p.submittedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.status === "SHORTLISTED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : p.status === "REJECTED"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handlePreviewProfile(p.id)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                          title="Preview Document"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Preview
                        </button>
                        <button
                          onClick={() => handleDeleteProfile(p.id)}
                          className="inline-flex items-center gap-1 text-xs text-destructive hover:underline font-medium"
                          title="Soft Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
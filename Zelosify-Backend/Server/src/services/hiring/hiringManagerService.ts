import prisma from "../../config/prisma/prisma.js";
import { ProfileStatus } from "@prisma/client";
import { createStorageService } from "../storage/storageFactory.js";

const storageService = createStorageService();

export class HiringManagerService {
  /**
   * Fetch openings strictly belonging to the logged-in hiring manager.
   */
  static async getOwnOpenings(hiringManagerId: string) {
    const openings = await prisma.opening.findMany({
      where: { hiringManagerId },
      include: {
        _count: {
          select: {
            hiringProfiles: {
              where: { isDeleted: false },
            },
          },
        },
      },
      orderBy: { postedDate: "desc" },
    });

    return openings.map((op) => ({
      ...op,
      profilesCount: op._count.hiringProfiles,
    }));
  }

  /**
   * Fetch submitted profiles for a specific opening with AI recommendation fields.
   * Enforces strict ownership scoping: opening.hiringManagerId === hiringManagerId.
   */
  static async getOpeningProfiles(openingId: string, hiringManagerId: string) {
    // 1. Verify opening ownership
    const opening = await prisma.opening.findFirst({
      where: { id: openingId, hiringManagerId },
    });

    if (!opening) {
      throw new Error("Opening not found or unauthorized");
    }

    // 2. Fetch profiles with AI fields and audit reasoning metadata
    const profiles = await prisma.hiringProfile.findMany({
      where: {
        openingId,
        isDeleted: false,
      },
      include: {
        audits: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return {
      opening,
      profiles: profiles.map((p) => {
        // Derive recommendation badge based on score / recommendation thresholds
        let badge: "Recommended" | "Borderline" | "Not Recommended" | "Pending" = "Pending";
        if (p.recommendationScore !== null) {
          if (p.recommendationScore >= 0.75) {
            badge = "Recommended";
          } else if (p.recommendationScore >= 0.5) {
            badge = "Borderline";
          } else {
            badge = "Not Recommended";
          }
        }

        const fileName = p.s3Key.split("/").pop() || p.s3Key;

        return {
          id: p.id,
          openingId: p.openingId,
          s3Key: p.s3Key,
          fileName,
          uploadedBy: p.uploadedBy,
          submittedAt: p.submittedAt,
          status: p.status,
          shortlistedBy: p.shortlistedBy,
          shortlistedAt: p.shortlistedAt,
          rejectedBy: p.rejectedBy,
          rejectedAt: p.rejectedAt,
          // AI Recommendation fields
          recommended: p.recommended,
          recommendationBadge: badge,
          recommendationScore: p.recommendationScore,
          recommendationScorePercent: p.recommendationScore !== null ? Math.round(p.recommendationScore * 100) : null,
          recommendationConfidence: p.recommendationConfidence,
          recommendationConfidencePercent: p.recommendationConfidence !== null ? Math.round(p.recommendationConfidence * 100) : null,
          recommendationReason: p.recommendationReason,
          recommendationLatencyMs: p.recommendationLatencyMs,
          recommendationVersion: p.recommendationVersion,
          recommendedAt: p.recommendedAt,
          audit: p.audits[0] || null,
        };
      }),
    };
  }

  /**
   * Shortlist a candidate profile.
   * Must run inside a Prisma transaction and verify ownership.
   */
  static async shortlistProfile(profileId: number, hiringManagerId: string) {
    return prisma.$transaction(async (tx) => {
      const profile = await tx.hiringProfile.findUnique({
        where: { id: profileId },
        include: { opening: true },
      });

      if (!profile || profile.opening.hiringManagerId !== hiringManagerId) {
        throw new Error("Candidate profile not found or unauthorized");
      }

      const updated = await tx.hiringProfile.update({
        where: { id: profileId },
        data: {
          status: ProfileStatus.SHORTLISTED,
          shortlistedBy: hiringManagerId,
          shortlistedAt: new Date(),
          rejectedBy: null,
          rejectedAt: null,
        },
      });

      return updated;
    });
  }

  /**
   * Reject a candidate profile.
   * Must run inside a Prisma transaction and verify ownership.
   */
  static async rejectProfile(profileId: number, hiringManagerId: string) {
    return prisma.$transaction(async (tx) => {
      const profile = await tx.hiringProfile.findUnique({
        where: { id: profileId },
        include: { opening: true },
      });

      if (!profile || profile.opening.hiringManagerId !== hiringManagerId) {
        throw new Error("Candidate profile not found or unauthorized");
      }

      const updated = await tx.hiringProfile.update({
        where: { id: profileId },
        data: {
          status: ProfileStatus.REJECTED,
          rejectedBy: hiringManagerId,
          rejectedAt: new Date(),
          shortlistedBy: null,
          shortlistedAt: null,
        },
      });

      return updated;
    });
  }

  /**
   * Secure presigned preview URL for hiring manager.
   */
  static async getPreviewUrl(profileId: number, hiringManagerId: string) {
    const profile = await prisma.hiringProfile.findUnique({
      where: { id: profileId },
      include: { opening: true },
    });

    if (!profile || profile.opening.hiringManagerId !== hiringManagerId) {
      throw new Error("Candidate profile not found or unauthorized");
    }

    const previewUrl = await storageService.getObjectURL(profile.s3Key);
    return { previewUrl };
  }
}

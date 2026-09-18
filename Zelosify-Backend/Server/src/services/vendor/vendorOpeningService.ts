import prisma from "../../config/prisma/prisma.js";
import { createStorageService } from "../storage/storageFactory.js";
import { ProfileStatus } from "@prisma/client";
import { RecommendationService } from "../agent/recommendationService.js";

const storageService = createStorageService();

export class VendorOpeningService {
  /**
   * Fetch paginated openings strictly filtered by vendor tenantId.
   */
  static async getOpenings(tenantId: string, page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      status: "OPEN",
    };

    if (search && search.trim().length > 0) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { contractType: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, openings] = await Promise.all([
      prisma.opening.count({ where }),
      prisma.opening.findMany({
        where,
        skip,
        take: limit,
        orderBy: { postedDate: "desc" },
      }),
    ]);

    // Fetch hiring manager details for each opening
    const managerIds = Array.from(new Set(openings.map((o) => o.hiringManagerId)));
    const managers = await prisma.user.findMany({
      where: { id: { in: managerIds } },
      select: { id: true, firstName: true, lastName: true, username: true },
    });
    const managerMap = new Map(
      managers.map((m) => [m.id, `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.username || "Hiring Manager"])
    );

    const formatted = openings.map((op) => ({
      ...op,
      hiringManagerName: managerMap.get(op.hiringManagerId) || "Hiring Manager",
    }));

    return {
      openings: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch opening details for vendor:
   * Includes opening metadata, hiring manager name, experience range,
   * count of vendor profiles, and only the vendor's own uploaded profiles.
   */
  static async getOpeningDetails(openingId: string, tenantId: string, userId: string) {
    const opening = await prisma.opening.findFirst({
      where: { id: openingId, tenantId },
    });

    if (!opening) {
      throw new Error("Opening not found or unauthorized");
    }

    // Lookup hiring manager name
    const manager = await prisma.user.findUnique({
      where: { id: opening.hiringManagerId },
      select: { firstName: true, lastName: true, username: true },
    });
    const hiringManagerName = manager
      ? `${manager.firstName || ""} ${manager.lastName || ""}`.trim() || manager.username
      : "Hiring Manager";

    // Fetch vendor's own uploaded profiles (excluding soft-deleted ones)
    // CRITICAL RBAC: Vendor must NOT see other vendors' profiles, AI recommendation, score, or reason
    const profiles = await prisma.hiringProfile.findMany({
      where: {
        openingId,
        uploadedBy: userId,
        isDeleted: false,
      },
      select: {
        id: true,
        s3Key: true,
        submittedAt: true,
        status: true,
        isDeleted: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    return {
      opening: {
        ...opening,
        hiringManagerName,
        experienceRange: `${opening.experienceMin} - ${opening.experienceMax ?? "N/A"} years`,
        profilesCount: profiles.length,
      },
      profiles,
    };
  }

  /**
   * Generates presigned S3 upload URL adhering to the strict path convention:
   * <bucket>/<tenantId>/<openingId>/<timestamp>_<filename>
   */
  static async generatePresignedUrl(
    openingId: string,
    tenantId: string,
    fileName: string,
    contentType = "application/pdf"
  ) {
    // Validate opening exists and belongs to vendor tenant
    const opening = await prisma.opening.findFirst({
      where: { id: openingId, tenantId },
    });

    if (!opening) {
      throw new Error("Opening not found or unauthorized");
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const s3Key = `${tenantId}/${openingId}/${timestamp}_${cleanFileName}`;

    const presignedUrl = await storageService.getUploadURL(s3Key);

    return {
      presignedUrl,
      s3Key,
      expiresIn: 3600,
    };
  }

  /**
   * Submits candidate profiles inside a Prisma transaction and triggers the recommendation pipeline.
   */
  static async submitProfiles(
    openingId: string,
    tenantId: string,
    userId: string,
    s3Keys: string[]
  ) {
    // Validate opening belongs to vendor's tenant
    const opening = await prisma.opening.findFirst({
      where: { id: openingId, tenantId },
    });

    if (!opening) {
      throw new Error("Opening not found or unauthorized");
    }

    // Validate path convention on all keys
    for (const key of s3Keys) {
      if (!key.startsWith(`${tenantId}/${openingId}/`)) {
        throw new Error(`Invalid S3 key path convention: ${key}`);
      }
    }

    // Prisma Transaction for all inserts
    const createdProfiles = await prisma.$transaction(async (tx) => {
      const records = [];
      for (const s3Key of s3Keys) {
        // Idempotency: Check if already submitted
        const existing = await tx.hiringProfile.findUnique({
          where: { s3Key },
        });

        if (existing) {
          records.push(existing);
        } else {
          const profile = await tx.hiringProfile.create({
            data: {
              openingId,
              s3Key,
              uploadedBy: userId,
              status: ProfileStatus.SUBMITTED,
            },
          });
          records.push(profile);
        }
      }
      return records;
    });

    // Automatically trigger AI recommendation pipeline asynchronously for each submitted profile
    for (const profile of createdProfiles) {
      RecommendationService.triggerForProfile(profile.id);
    }

    return createdProfiles.map((p) => ({
      id: p.id,
      s3Key: p.s3Key,
      submittedAt: p.submittedAt,
      status: p.status,
    }));
  }

  /**
   * Soft-delete a profile uploaded by this vendor.
   */
  static async softDeleteProfile(profileId: number, userId: string, tenantId: string) {
    const profile = await prisma.hiringProfile.findUnique({
      where: { id: profileId },
      include: { opening: true },
    });

    if (!profile || profile.opening.tenantId !== tenantId || profile.uploadedBy !== userId) {
      throw new Error("Profile not found or unauthorized to delete");
    }

    await prisma.hiringProfile.update({
      where: { id: profileId },
      data: { isDeleted: true },
    });

    return { message: "Profile deleted successfully", profileId };
  }

  /**
   * Generates a backend-proxied presigned read URL for vendor preview.
   */
  static async getPreviewUrl(profileId: number, userId: string, tenantId: string) {
    const profile = await prisma.hiringProfile.findUnique({
      where: { id: profileId },
      include: { opening: true },
    });

    if (!profile || profile.opening.tenantId !== tenantId || profile.uploadedBy !== userId) {
      throw new Error("Profile not found or unauthorized to preview");
    }

    const previewUrl = await storageService.getObjectURL(profile.s3Key);
    return { previewUrl };
  }
}

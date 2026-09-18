import type { Response } from "express";
import { VendorOpeningService } from "../../services/vendor/vendorOpeningService.js";
import type { AuthenticatedRequest } from "../../types/typeIndex.js";

/**
 * Vendor Opening Controller - Thin controller without business logic.
 */
export class VendorOpeningController {
  /**
   * GET /api/v1/vendor/openings
   */
  static async getOpenings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = (req.user as any)?.tenant?.tenantId || (req.user as any)?.tenantId;
      if (!tenantId) {
        res.status(403).json({ message: "Forbidden: Missing tenant ID" });
        return;
      }
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const search = req.query.search as string;

      const data = await VendorOpeningService.getOpenings(tenantId, page, limit, search);
      res.status(200).json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch openings" });
    }
  }

  /**
   * GET /api/v1/vendor/openings/:id
   */
  static async getOpeningDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = (req.user as any)?.tenant?.tenantId || (req.user as any)?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) {
        res.status(401).json({ message: "Unauthorized: Missing user or tenant context" });
        return;
      }
      const openingId = req.params.id;

      const data = await VendorOpeningService.getOpeningDetails(openingId, tenantId, userId);
      res.status(200).json(data);
    } catch (err: any) {
      const status = err.message.includes("unauthorized") || err.message.includes("not found") ? 404 : 500;
      res.status(status).json({ message: err.message || "Failed to fetch opening details" });
    }
  }

  /**
   * POST /api/v1/vendor/openings/:id/profiles/presign
   */
  static async presignUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = (req.user as any)?.tenant?.tenantId || (req.user as any)?.tenantId;
      if (!tenantId) {
        res.status(403).json({ message: "Forbidden: Missing tenant context" });
        return;
      }
      const openingId = req.params.id;
      const { fileName, fileType } = req.body;

      if (!fileName) {
        res.status(400).json({ message: "fileName is required" });
        return;
      }

      const data = await VendorOpeningService.generatePresignedUrl(
        openingId,
        tenantId,
        fileName,
        fileType
      );
      res.status(200).json(data);
    } catch (err: any) {
      const status = err.message.includes("unauthorized") ? 403 : 500;
      res.status(status).json({ message: err.message || "Failed to generate presigned upload URL" });
    }
  }

  /**
   * POST /api/v1/vendor/openings/:id/profiles/upload
   */
  static async submitProfiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = (req.user as any)?.tenant?.tenantId || (req.user as any)?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) {
        res.status(401).json({ message: "Unauthorized: Missing user or tenant context" });
        return;
      }
      const openingId = req.params.id;
      const s3Keys: string[] = req.body.s3Keys || (req.body.s3Key ? [req.body.s3Key] : []);

      if (!s3Keys || s3Keys.length === 0) {
        res.status(400).json({ message: "At least one s3Key is required" });
        return;
      }

      const profiles = await VendorOpeningService.submitProfiles(
        openingId,
        tenantId,
        userId,
        s3Keys
      );

      res.status(201).json({
        message: "Profiles submitted successfully",
        profiles,
      });
    } catch (err: any) {
      const status = err.message.includes("unauthorized") ? 403 : 500;
      res.status(status).json({ message: err.message || "Failed to submit candidate profiles" });
    }
  }

  /**
   * DELETE /api/v1/vendor/profiles/:id
   */
  static async deleteProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = (req.user as any)?.tenant?.tenantId || (req.user as any)?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) {
        res.status(401).json({ message: "Unauthorized: Missing user or tenant context" });
        return;
      }
      const profileId = parseInt(req.params.id, 10);

      const data = await VendorOpeningService.softDeleteProfile(profileId, userId, tenantId);
      res.status(200).json(data);
    } catch (err: any) {
      const status = err.message.includes("unauthorized") ? 403 : 500;
      res.status(status).json({ message: err.message || "Failed to soft delete profile" });
    }
  }

  /**
   * GET /api/v1/vendor/profiles/:id/preview
   */
  static async previewProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = (req.user as any)?.tenant?.tenantId || (req.user as any)?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) {
        res.status(401).json({ message: "Unauthorized: Missing user or tenant context" });
        return;
      }
      const profileId = parseInt(req.params.id, 10);

      const data = await VendorOpeningService.getPreviewUrl(profileId, userId, tenantId);
      res.status(200).json(data);
    } catch (err: any) {
      const status = err.message.includes("unauthorized") ? 403 : 500;
      res.status(status).json({ message: err.message || "Failed to preview profile" });
    }
  }
}

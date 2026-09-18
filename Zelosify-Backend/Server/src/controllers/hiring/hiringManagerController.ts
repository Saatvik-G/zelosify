import type { Response } from "express";
import { HiringManagerService } from "../../services/hiring/hiringManagerService.js";
import type { AuthenticatedRequest } from "../../types/typeIndex.js";

/**
 * Hiring Manager Controller - Thin controller without business logic.
 */
export class HiringManagerController {
  /**
   * GET /api/v1/hiring-manager/openings
   */
  static async getOpenings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hiringManagerId = req.user?.id;
      if (!hiringManagerId) {
        res.status(401).json({ message: "Unauthorized: Missing user ID" });
        return;
      }
      const openings = await HiringManagerService.getOwnOpenings(hiringManagerId);
      res.status(200).json({ openings });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch openings" });
    }
  }

  /**
   * GET /api/v1/hiring-manager/openings/:id/profiles
   */
  static async getProfiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hiringManagerId = req.user?.id;
      if (!hiringManagerId) {
        res.status(401).json({ message: "Unauthorized: Missing user ID" });
        return;
      }
      const openingId = req.params.id;

      const data = await HiringManagerService.getOpeningProfiles(openingId, hiringManagerId);
      res.status(200).json(data);
    } catch (err: any) {
      const status = err.message.includes("unauthorized") ? 403 : 404;
      res.status(status).json({ message: err.message || "Failed to fetch candidate profiles" });
    }
  }

  /**
   * POST /api/v1/hiring-manager/profiles/:id/shortlist
   */
  static async shortlist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hiringManagerId = req.user?.id;
      if (!hiringManagerId) {
        res.status(401).json({ message: "Unauthorized: Missing user ID" });
        return;
      }
      const profileId = parseInt(req.params.id, 10);

      const profile = await HiringManagerService.shortlistProfile(profileId, hiringManagerId);
      res.status(200).json({
        message: "Candidate profile shortlisted successfully",
        profile,
      });
    } catch (err: any) {
      const status = err.message.includes("unauthorized") ? 403 : 400;
      res.status(status).json({ message: err.message || "Failed to shortlist profile" });
    }
  }

  /**
   * POST /api/v1/hiring-manager/profiles/:id/reject
   */
  static async reject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hiringManagerId = req.user?.id;
      if (!hiringManagerId) {
        res.status(401).json({ message: "Unauthorized: Missing user ID" });
        return;
      }
      const profileId = parseInt(req.params.id, 10);

      const profile = await HiringManagerService.rejectProfile(profileId, hiringManagerId);
      res.status(200).json({
        message: "Candidate profile rejected successfully",
        profile,
      });
    } catch (err: any) {
      const status = err.message.includes("unauthorized") ? 403 : 400;
      res.status(status).json({ message: err.message || "Failed to reject profile" });
    }
  }

  /**
   * GET /api/v1/hiring-manager/profiles/:id/preview
   */
  static async preview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hiringManagerId = req.user?.id;
      if (!hiringManagerId) {
        res.status(401).json({ message: "Unauthorized: Missing user ID" });
        return;
      }
      const profileId = parseInt(req.params.id, 10);

      const data = await HiringManagerService.getPreviewUrl(profileId, hiringManagerId);
      res.status(200).json(data);
    } catch (err: any) {
      const status = err.message.includes("unauthorized") ? 403 : 400;
      res.status(status).json({ message: err.message || "Failed to preview profile" });
    }
  }
}

import express, { Router } from "express";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../middlewares/auth/authorizeMiddleware.js";
import { requireTenant } from "../../middlewares/auth/tenantMiddleware.js";
import { VendorOpeningController } from "../../controllers/vendor/vendorOpeningController.js";
import vendorRequestRoutes from "./vendorRequestRoutes.js";

const router = Router();

/**
 * @route /vendor/requests (existing)
 */
router.use("/requests", vendorRequestRoutes);

/**
 * IT Vendor Contract Openings & Profile Upload Endpoints
 * All routes require authentication, IT_VENDOR role, and tenant membership.
 */
router.get(
  "/openings",
  authenticateUser as any,
  authorizeRole("IT_VENDOR") as any,
  requireTenant as any,
  VendorOpeningController.getOpenings as any
);

router.get(
  "/openings/:id",
  authenticateUser as any,
  authorizeRole("IT_VENDOR") as any,
  requireTenant as any,
  VendorOpeningController.getOpeningDetails as any
);

router.post(
  "/openings/:id/profiles/presign",
  authenticateUser as any,
  authorizeRole("IT_VENDOR") as any,
  requireTenant as any,
  VendorOpeningController.presignUpload as any
);

router.post(
  "/openings/:id/profiles/upload",
  authenticateUser as any,
  authorizeRole("IT_VENDOR") as any,
  requireTenant as any,
  VendorOpeningController.submitProfiles as any
);

router.delete(
  "/profiles/:id",
  authenticateUser as any,
  authorizeRole("IT_VENDOR") as any,
  requireTenant as any,
  VendorOpeningController.deleteProfile as any
);

router.get(
  "/profiles/:id/preview",
  authenticateUser as any,
  authorizeRole("IT_VENDOR") as any,
  requireTenant as any,
  VendorOpeningController.previewProfile as any
);

export default router;

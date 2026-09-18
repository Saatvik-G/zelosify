import { Router, type RequestHandler } from "express";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../middlewares/auth/authorizeMiddleware.js";
import { requireHiringManager } from "../../middlewares/auth/tenantMiddleware.js";
import { HiringManagerController } from "../../controllers/hiring/hiringManagerController.js";
import { fetchData } from "../../controllers/controllers.js";

const router = Router();

/**
 * Legacy placeholder route
 */
router.get(
  "/",
  authenticateUser as RequestHandler,
  authorizeRole("HIRING_MANAGER") as RequestHandler,
  (async (req, res, next) => {
    try {
      await fetchData(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

/**
 * =============================================================================
 * HIRING MANAGER ROUTES - CONTRACT VACANCY & CANDIDATE EVALUATION
 * =============================================================================
 */

// GET /api/v1/hiring-manager/openings - only own openings
router.get(
  "/openings",
  authenticateUser as any,
  authorizeRole("HIRING_MANAGER") as any,
  requireHiringManager as any,
  HiringManagerController.getOpenings as any
);

// GET /api/v1/hiring-manager/openings/:id/profiles - submitted profiles with recommendation badge, score, latency, explanation
router.get(
  "/openings/:id/profiles",
  authenticateUser as any,
  authorizeRole("HIRING_MANAGER") as any,
  requireHiringManager as any,
  HiringManagerController.getProfiles as any
);

// POST /api/v1/hiring-manager/profiles/:id/shortlist
router.post(
  "/profiles/:id/shortlist",
  authenticateUser as any,
  authorizeRole("HIRING_MANAGER") as any,
  requireHiringManager as any,
  HiringManagerController.shortlist as any
);

// POST /api/v1/hiring-manager/profiles/:id/reject
router.post(
  "/profiles/:id/reject",
  authenticateUser as any,
  authorizeRole("HIRING_MANAGER") as any,
  requireHiringManager as any,
  HiringManagerController.reject as any
);

// GET /api/v1/hiring-manager/profiles/:id/preview
router.get(
  "/profiles/:id/preview",
  authenticateUser as any,
  authorizeRole("HIRING_MANAGER") as any,
  requireHiringManager as any,
  HiringManagerController.preview as any
);

export default router;

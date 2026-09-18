import type { Request, Response, NextFunction } from "express";

/**
 * Ensures the authenticated user belongs to an active tenant.
 * Mandatory for all IT_VENDOR operations.
 */
export const requireTenant = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const tenantId = req.user?.tenant?.tenantId || req.user?.tenantId;
  if (!tenantId) {
    res.status(403).json({
      message: "Forbidden: User is not associated with an authorized tenant",
    });
    return;
  }
  next();
};

/**
 * Ensures the authenticated user is an authorized hiring manager.
 */
export const requireHiringManager = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.id || req.user?.role !== "HIRING_MANAGER") {
    res.status(403).json({
      message: "Forbidden: Hiring Manager authorization required",
    });
    return;
  }
  next();
};

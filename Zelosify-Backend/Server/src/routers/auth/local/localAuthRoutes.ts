// src/routers/auth/normalAuthRoutes.ts
import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import asyncHandler from "../../../utils/handler/asyncHandler.js";
import { authenticateUser } from "../../../middlewares/auth/authenticateMiddleware.js";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import prisma from "../../../config/prisma/prisma.js";
import {
  logout,
  register,
  verifyLogin,
  verifyTOTP,
} from "../../../controllers/controllers.js";
import { AuthenticatedRequest } from "../../../types/common.js";

/**
 * Wraps async handlers to ensure void return type
 * @param handler - The request handler to wrap
 * @returns Wrapped RequestHandler with proper error handling
 */
const wrapHandler = (handler: RequestHandler): RequestHandler =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await handler(req, res, next);
  });

/**
 * Wraps async handlers for middleware-protected routes
 * @param handler - The request handler to wrap
 * @returns Wrapped RequestHandler with proper error handling
 */
const wrapProtectedHandler = (handler: RequestHandler): RequestHandler =>
  asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      await handler(req, res, next);
    }
  );

const router = Router();

/**
 * =============================================================================
 * LOCAL AUTHENTICATION ROUTES
 * =============================================================================
 */

/**
 * POST /register - Register new user account
 * Creates a new user account with provided credentials
 */
router.post("/register", wrapHandler(register));

/**
 * POST /verify-login - Verify user login credentials
 * Validates user credentials and initiates login process
 */
router.post("/verify-login", wrapHandler(verifyLogin));

/**
 * POST /verify-totp - Verify TOTP for two-factor authentication
 * Validates TOTP code for users with 2FA enabled
 */
router.post("/verify-totp", wrapHandler(verifyTOTP));

/**
 * POST /logout - Logout authenticated user
 * Requires authentication middleware to access user session
 */
router.post("/logout", authenticateUser, wrapProtectedHandler(logout));

/**
 * GET /dev-login - Development login helper to set cookie for video demo & testing
 * Usage:
 *   http://localhost:5000/api/v1/auth/dev-login?role=vendor -> sets Alfred Pennyworth cookie and redirects to /vendor/openings
 *   http://localhost:5000/api/v1/auth/dev-login?role=manager -> sets Lucius Fox cookie and redirects to /hiring-manager/openings
 */
router.get(
  "/dev-login",
  asyncHandler(async (req: Request, res: Response) => {
    const roleParam = req.query.role === "manager" ? "HIRING_MANAGER" : "IT_VENDOR";
    const user = await prisma.user.findFirst({
      where: { role: roleParam === "HIRING_MANAGER" ? Role.HIRING_MANAGER : Role.IT_VENDOR },
    });

    if (!user) {
      res.status(404).json({ error: `User not found for role ${roleParam}` });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "7d" }
    );

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectPath = roleParam === "HIRING_MANAGER" ? "/hiring-manager/openings" : "/vendor/openings";
    res.redirect(`${frontendUrl}${redirectPath}`);
  })
);

export default router;

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../../src/config/prisma/prisma.js";
import { VendorOpeningService } from "../../src/services/vendor/vendorOpeningService.js";
import { HiringManagerService } from "../../src/services/hiring/hiringManagerService.js";
import { Role, OpeningStatus } from "@prisma/client";

describe("RBAC and Multi-Tenant Query Scoping Unit Tests", () => {
  let tenantA: any;
  let tenantB: any;
  let managerA: any;
  let managerB: any;
  let vendorA: any;
  let vendorB: any;
  let openingA: any;
  let openingB: any;

  beforeAll(async () => {
    // 1. Create two isolated tenants
    tenantA = await prisma.tenants.create({
      data: { companyName: "Tenant Alpha Corp" },
    });
    tenantB = await prisma.tenants.create({
      data: { companyName: "Tenant Beta Corp" },
    });

    // 2. Create managers in each tenant
    managerA = await prisma.user.create({
      data: {
        email: "manager.a@alpha.com",
        username: "manager.a",
        role: Role.HIRING_MANAGER,
        tenantId: tenantA.tenantId,
      },
    });

    managerB = await prisma.user.create({
      data: {
        email: "manager.b@beta.com",
        username: "manager.b",
        role: Role.HIRING_MANAGER,
        tenantId: tenantB.tenantId,
      },
    });

    // 3. Create vendors in each tenant
    vendorA = await prisma.user.create({
      data: {
        email: "vendor.a@alpha.com",
        username: "vendor.a",
        role: Role.IT_VENDOR,
        tenantId: tenantA.tenantId,
      },
    });

    vendorB = await prisma.user.create({
      data: {
        email: "vendor.b@beta.com",
        username: "vendor.b",
        role: Role.IT_VENDOR,
        tenantId: tenantB.tenantId,
      },
    });

    // 4. Create openings
    openingA = await prisma.opening.create({
      data: {
        title: "Alpha Senior Architect",
        tenantId: tenantA.tenantId,
        hiringManagerId: managerA.id,
        experienceMin: 5,
        location: "Remote",
        status: OpeningStatus.OPEN,
      },
    });

    openingB = await prisma.opening.create({
      data: {
        title: "Beta Cloud Engineer",
        tenantId: tenantB.tenantId,
        hiringManagerId: managerB.id,
        experienceMin: 3,
        location: "New York, NY",
        status: OpeningStatus.OPEN,
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.hiringProfile.deleteMany({
      where: { openingId: { in: [openingA.id, openingB.id] } },
    });
    await prisma.opening.deleteMany({
      where: { id: { in: [openingA.id, openingB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [managerA.id, managerB.id, vendorA.id, vendorB.id] } },
    });
    await prisma.tenants.deleteMany({
      where: { tenantId: { in: [tenantA.tenantId, tenantB.tenantId] } },
    });
  });

  describe("Tenant Isolation (IT_VENDOR)", () => {
    it("should only return openings under Vendor A's tenant", async () => {
      const result = await VendorOpeningService.getOpenings(tenantA.tenantId, 1, 10);
      const openingIds = result.openings.map((o) => o.id);

      expect(openingIds).toContain(openingA.id);
      expect(openingIds).not.toContain(openingB.id);
    });

    it("should reject Vendor A attempting to access Opening B (Cross-Tenant Leakage Attempt)", async () => {
      await expect(
        VendorOpeningService.getOpeningDetails(openingB.id, tenantA.tenantId, vendorA.id)
      ).rejects.toThrow("Opening not found or unauthorized");
    });

    it("should reject Vendor A generating presigned URL for Opening B", async () => {
      await expect(
        VendorOpeningService.generatePresignedUrl(openingB.id, tenantA.tenantId, "resume.pdf")
      ).rejects.toThrow("Opening not found or unauthorized");
    });
  });

  describe("Ownership Scoping (HIRING_MANAGER)", () => {
    it("should only return openings owned by Manager A", async () => {
      const resultA = await HiringManagerService.getOwnOpenings(managerA.id);
      const idsA = resultA.map((o) => o.id);

      expect(idsA).toContain(openingA.id);
      expect(idsA).not.toContain(openingB.id);
    });

    it("should reject Manager B attempting to view profiles for Opening A (Cross-Manager Leakage)", async () => {
      await expect(
        HiringManagerService.getOpeningProfiles(openingA.id, managerB.id)
      ).rejects.toThrow("Opening not found or unauthorized");
    });
  });

  describe("Vendor Data Masking (Confidentiality)", () => {
    it("should never expose AI recommendation score or explanation to IT_VENDOR", async () => {
      // Create a profile with AI fields
      const s3Key = `${tenantA.tenantId}/${openingA.id}/1700000000000_masked_candidate.pdf`;
      const profile = await prisma.hiringProfile.create({
        data: {
          openingId: openingA.id,
          s3Key,
          uploadedBy: vendorA.id,
          recommended: true,
          recommendationScore: 0.95,
          recommendationReason: "Proprietary internal evaluation",
          recommendationConfidence: 0.99,
        },
      });

      const vendorView = await VendorOpeningService.getOpeningDetails(
        openingA.id,
        tenantA.tenantId,
        vendorA.id
      );

      const foundProfile: any = vendorView.profiles.find((p) => p.id === profile.id);
      expect(foundProfile).toBeDefined();
      expect(foundProfile.recommended).toBeUndefined();
      expect(foundProfile.recommendationScore).toBeUndefined();
      expect(foundProfile.recommendationReason).toBeUndefined();
      expect(foundProfile.recommendationConfidence).toBeUndefined();

      // Clean up
      await prisma.hiringProfile.delete({ where: { id: profile.id } });
    });
  });
});

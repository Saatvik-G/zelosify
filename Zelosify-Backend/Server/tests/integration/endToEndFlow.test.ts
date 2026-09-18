import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../../src/config/prisma/prisma.js";
import { VendorOpeningService } from "../../src/services/vendor/vendorOpeningService.js";
import { HiringManagerService } from "../../src/services/hiring/hiringManagerService.js";
import { AgentOrchestrator } from "../../src/services/agent/agentOrchestrator.js";
import { Role, OpeningStatus, ProfileStatus } from "@prisma/client";

describe("End-to-End Integration Test: Presign -> Submit -> Recommend -> Shortlist -> Soft Delete", () => {
  let tenant: any;
  let manager: any;
  let vendor: any;
  let opening: any;
  let submittedProfileId: number;

  beforeAll(async () => {
    // 1. Setup tenant, hiring manager, vendor, opening
    tenant = await prisma.tenants.create({
      data: { companyName: "Wayne Enterprises E2E" },
    });

    manager = await prisma.user.create({
      data: {
        email: "e2e.manager@wayne.com",
        username: "e2e.manager",
        role: Role.HIRING_MANAGER,
        tenantId: tenant.tenantId,
      },
    });

    vendor = await prisma.user.create({
      data: {
        email: "e2e.vendor@wayne.com",
        username: "e2e.vendor",
        role: Role.IT_VENDOR,
        tenantId: tenant.tenantId,
      },
    });

    opening = await prisma.opening.create({
      data: {
        title: "Senior Full-Stack Cloud Engineer",
        description: "Looking for an expert with Node.js, TypeScript, PostgreSQL, and AWS.",
        tenantId: tenant.tenantId,
        hiringManagerId: manager.id,
        experienceMin: 4,
        experienceMax: 8,
        location: "Remote",
        contractType: "C2C",
        status: OpeningStatus.OPEN,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.recommendationAudit.deleteMany({
      where: { profile: { openingId: opening.id } },
    });
    await prisma.hiringProfile.deleteMany({
      where: { openingId: opening.id },
    });
    await prisma.opening.delete({ where: { id: opening.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [manager.id, vendor.id] } },
    });
    await prisma.tenants.delete({ where: { tenantId: tenant.tenantId } });
  });

  it("Step 1: IT Vendor generates presigned upload URL enforcing path convention", async () => {
    const presignResult = await VendorOpeningService.generatePresignedUrl(
      opening.id,
      tenant.tenantId,
      "candidate_senior_dev.pdf"
    );

    expect(presignResult.presignedUrl).toBeDefined();
    expect(presignResult.s3Key).toBeDefined();
    // Path convention: <tenantId>/<openingId>/<timestamp>_<filename>
    expect(presignResult.s3Key.startsWith(`${tenant.tenantId}/${opening.id}/`)).toBe(true);
    expect(presignResult.s3Key.endsWith("_candidate_senior_dev.pdf")).toBe(true);
  });

  it("Step 2: IT Vendor submits candidate profile inside Prisma transaction", async () => {
    const timestamp = Date.now();
    const s3Key = `${tenant.tenantId}/${opening.id}/${timestamp}_candidate_alice.pdf`;

    const submitted = await VendorOpeningService.submitProfiles(
      opening.id,
      tenant.tenantId,
      vendor.id,
      [s3Key]
    );

    expect(submitted.length).toBe(1);
    expect(submitted[0].s3Key).toBe(s3Key);
    expect(submitted[0].status).toBe(ProfileStatus.SUBMITTED);
    submittedProfileId = submitted[0].id;
  });

  it("Step 3: Agent Orchestrator evaluates candidate with tool-calling and persists recommendation", async () => {
    const profile = await prisma.hiringProfile.findUnique({
      where: { id: submittedProfileId },
    });
    expect(profile).toBeDefined();

    const orchestrator = new AgentOrchestrator();
    const agentResult = await orchestrator.processProfileRecommendation({
      profileId: profile!.id,
      openingId: opening.id,
      s3Key: profile!.s3Key,
      opening: {
        title: opening.title,
        experienceMin: opening.experienceMin,
        experienceMax: opening.experienceMax,
        location: opening.location,
        contractType: opening.contractType,
      },
    });

    expect(agentResult.score).toBeGreaterThan(0);
    expect(agentResult.confidence).toBeGreaterThan(0);
    expect(agentResult.reason).toBeDefined();

    // Verify DB update
    const updatedProfile = await prisma.hiringProfile.findUnique({
      where: { id: submittedProfileId },
      include: { audits: true },
    });

    expect(updatedProfile!.recommended).toBe(agentResult.recommended);
    expect(updatedProfile!.recommendationScore).toBe(agentResult.score);
    expect(updatedProfile!.recommendationLatencyMs).toBeGreaterThan(0);
    expect(updatedProfile!.recommendationVersion).toBe("v1.0.0");
    expect(updatedProfile!.recommendedAt).not.toBeNull();

    // Verify Audit record
    expect(updatedProfile!.audits.length).toBeGreaterThanOrEqual(1);
    const audit = updatedProfile!.audits[0];
    expect(Array.isArray(audit.toolCalls)).toBe(true);
    expect((audit.toolCalls as string[])).toContain("deterministic_matching");
    expect(audit.finalDecision).toBeDefined();
  });

  it("Step 4: Hiring Manager views profile with AI badge, score %, confidence %, latency, and explanation", async () => {
    const result = await HiringManagerService.getOpeningProfiles(opening.id, manager.id);

    expect(result.profiles.length).toBe(1);
    const p = result.profiles[0];
    expect(p.id).toBe(submittedProfileId);
    expect(p.recommendationBadge).toMatch(/Recommended|Borderline|Not Recommended/);
    expect(p.recommendationScorePercent).toBeGreaterThan(0);
    expect(p.recommendationConfidencePercent).toBeGreaterThan(0);
    expect(p.recommendationReason).toBeDefined();
    expect(p.recommendationLatencyMs).toBeGreaterThan(0);
    expect(p.audit).toBeDefined();
  });

  it("Step 5: Hiring Manager shortlists profile", async () => {
    const shortlisted = await HiringManagerService.shortlistProfile(submittedProfileId, manager.id);

    expect(shortlisted.status).toBe(ProfileStatus.SHORTLISTED);
    expect(shortlisted.shortlistedBy).toBe(manager.id);
    expect(shortlisted.shortlistedAt).not.toBeNull();
  });

  it("Step 6: IT Vendor soft-deletes their profile", async () => {
    const res = await VendorOpeningService.softDeleteProfile(submittedProfileId, vendor.id, tenant.tenantId);
    expect(res.profileId).toBe(submittedProfileId);

    const check = await prisma.hiringProfile.findUnique({
      where: { id: submittedProfileId },
    });
    expect(check!.isDeleted).toBe(true);

    // Verify it is excluded from active listings
    const vendorView = await VendorOpeningService.getOpeningDetails(opening.id, tenant.tenantId, vendor.id);
    expect(vendorView.profiles.some((p) => p.id === submittedProfileId)).toBe(false);

    const managerView = await HiringManagerService.getOpeningProfiles(opening.id, manager.id);
    expect(managerView.profiles.some((p) => p.id === submittedProfileId)).toBe(false);
  });
});

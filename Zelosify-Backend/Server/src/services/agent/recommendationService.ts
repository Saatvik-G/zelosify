import prisma from "../../config/prisma/prisma.js";
import { AgentOrchestrator } from "./agentOrchestrator.js";
import { logStructured } from "../../utils/logger/structuredLogger.js";

const orchestrator = new AgentOrchestrator();

export class RecommendationService {
  /**
   * Triggers the AI recommendation pipeline for a submitted candidate profile.
   * Runs asynchronously to fulfill the strict latency constraint (no blocking API call > 2s).
   */
  static async triggerForProfile(profileId: number): Promise<void> {
    // Run asynchronously in background without blocking calling request
    setImmediate(async () => {
      try {
        const profile = await prisma.hiringProfile.findUnique({
          where: { id: profileId },
          include: {
            opening: true,
          },
        });

        if (!profile) {
          logStructured({
            level: "warn",
            event: "RECOMMENDATION_PROFILE_NOT_FOUND",
            profileId,
          });
          return;
        }

        // Idempotency check: If already recommended, skip duplicate execution
        if (profile.recommended !== null && profile.recommendationScore !== null) {
          logStructured({
            level: "info",
            event: "RECOMMENDATION_SKIPPED_ALREADY_PROCESSED",
            profileId,
            finalScore: profile.recommendationScore,
          });
          return;
        }

        await orchestrator.processProfileRecommendation({
          profileId: profile.id,
          openingId: profile.openingId,
          s3Key: profile.s3Key,
          opening: {
            title: profile.opening.title,
            experienceMin: profile.opening.experienceMin,
            experienceMax: profile.opening.experienceMax,
            location: profile.opening.location || "Remote",
            contractType: profile.opening.contractType,
          },
        });
      } catch (err: any) {
        logStructured({
          level: "error",
          event: "RECOMMENDATION_PIPELINE_FAILED",
          profileId,
          error: err.message,
        });
      }
    });
  }
}

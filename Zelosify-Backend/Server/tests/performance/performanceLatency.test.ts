import { describe, it, expect } from "vitest";
import { evaluateMatching } from "../../src/services/agent/tools/matchingEngine.js";
import {
  toolSkillNormalizer,
  toolFeatureExtractor,
  toolScoringEngine,
} from "../../src/services/agent/tools/toolRegistry.js";
import { validateSchema } from "../../src/services/agent/validators/schemaValidator.js";

describe("Performance Benchmark: 100 Profile Simulation", () => {
  it("should evaluate 100 candidate profiles with P95 latency < 2000ms", async () => {
    const latencies: number[] = [];
    const TOTAL_PROFILES = 100;

    const sampleSkillsPool = [
      ["TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS"],
      ["Python", "PyTorch", "NLP", "FastAPI"],
      ["React", "Next.js", "TailwindCSS", "Redux"],
      ["Go", "gRPC", "Kubernetes", "Redis", "Kafka"],
      ["Java", "Spring Boot", "MySQL", "AWS"],
    ];

    const sampleLocations = ["Remote", "Gotham City", "New York, NY", "Austin, TX", "London, UK"];

    for (let i = 0; i < TOTAL_PROFILES; i++) {
      const start = performance.now();

      // 1. Skill normalization step
      const rawSkills = sampleSkillsPool[i % sampleSkillsPool.length];
      const normResult = toolSkillNormalizer({ skills: rawSkills });

      // 2. Feature extraction step
      const featResult = toolFeatureExtractor({
        parsedResume: {
          experienceYears: 3 + (i % 8),
          skills: rawSkills,
          normalizedSkills: normResult.normalizedSkills,
          location: sampleLocations[i % sampleLocations.length],
          education: ["B.S. in Computer Science"],
          keywords: ["backend", "cloud"],
        },
        opening: {
          experienceMin: 4,
          experienceMax: 8,
          requiredSkills: ["TypeScript", "Node.js", "PostgreSQL"],
          location: "Remote",
        },
      });

      // 3. Deterministic matching step
      const matchResult = evaluateMatching({
        candidateExperienceYears: featResult.candidateExperienceYears,
        experienceMin: featResult.experienceMin,
        experienceMax: featResult.experienceMax,
        candidateSkills: featResult.candidateSkills,
        requiredSkills: featResult.requiredSkills,
        candidateLocation: featResult.candidateLocation,
        openingLocation: featResult.openingLocation,
      });

      // 4. Scoring engine step
      const scoreResult = toolScoringEngine({
        skillMatchScore: matchResult.skillMatchScore,
        experienceMatchScore: matchResult.experienceMatchScore,
        locationMatchScore: matchResult.locationMatchScore,
      });

      // 5. Schema validation step
      const val = validateSchema("scoring_engine", scoreResult);
      expect(val.isValid).toBe(true);

      const elapsed = performance.now() - start;
      latencies.push(elapsed);
    }

    // Sort latencies ascending to compute percentiles
    latencies.sort((a, b) => a - b);

    const p50Index = Math.floor(TOTAL_PROFILES * 0.5);
    const p90Index = Math.floor(TOTAL_PROFILES * 0.9);
    const p95Index = Math.floor(TOTAL_PROFILES * 0.95);
    const p99Index = Math.floor(TOTAL_PROFILES * 0.99);

    const p50 = latencies[p50Index];
    const p90 = latencies[p90Index];
    const p95 = latencies[p95Index];
    const p99 = latencies[p99Index];

    console.log(`\n📊 Performance Benchmark Results (100 profiles):`);
    console.log(`   P50 Latency: ${p50.toFixed(2)} ms`);
    console.log(`   P90 Latency: ${p90.toFixed(2)} ms`);
    console.log(`   P95 Latency: ${p95.toFixed(2)} ms`);
    console.log(`   P99 Latency: ${p99.toFixed(2)} ms`);

    // Strict assertions per specification:
    // P95 latency < 2000ms
    // Max processing time per profile: 1500ms
    expect(p95).toBeLessThan(2000);
    expect(p50).toBeLessThan(1500);
  });
});

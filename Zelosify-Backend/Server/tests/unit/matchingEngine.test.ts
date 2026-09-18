import { describe, it, expect } from "vitest";
import {
  calculateExperienceScore,
  calculateSkillMatchScore,
  calculateLocationScore,
  evaluateMatching,
} from "../../src/services/agent/tools/matchingEngine.js";

describe("Deterministic Matching Engine Unit Tests", () => {
  describe("Experience Score Boundaries", () => {
    it("should return 0 when candidateExp < min", () => {
      expect(calculateExperienceScore(2, 3, 5)).toBe(0);
      expect(calculateExperienceScore(0, 1, 3)).toBe(0);
    });

    it("should return 1 when candidateExp is within [min, max]", () => {
      expect(calculateExperienceScore(3, 3, 5)).toBe(1);
      expect(calculateExperienceScore(4, 3, 5)).toBe(1);
      expect(calculateExperienceScore(5, 3, 5)).toBe(1);
    });

    it("should return 1 when candidateExp >= min and max is null", () => {
      expect(calculateExperienceScore(3, 3, null)).toBe(1);
      expect(calculateExperienceScore(10, 3, null)).toBe(1);
    });

    it("should return 0.8 when candidateExp > max", () => {
      expect(calculateExperienceScore(6, 3, 5)).toBe(0.8);
      expect(calculateExperienceScore(15, 5, 10)).toBe(0.8);
    });
  });

  describe("Skill Overlap Accuracy", () => {
    it("should return 1.0 when all required skills are present", () => {
      const candidateSkills = ["TypeScript", "Node.js", "React", "PostgreSQL"];
      const requiredSkills = ["typescript", "node.js", "postgresql"];
      expect(calculateSkillMatchScore(candidateSkills, requiredSkills)).toBe(1.0);
    });

    it("should return correct fraction for partial overlap", () => {
      const candidateSkills = ["React", "CSS"];
      const requiredSkills = ["React", "Node.js", "Docker", "AWS"];
      expect(calculateSkillMatchScore(candidateSkills, requiredSkills)).toBe(0.25);
    });

    it("should return 0.0 when there is zero overlap", () => {
      const candidateSkills = ["Ruby", "Rails"];
      const requiredSkills = ["Go", "Kubernetes"];
      expect(calculateSkillMatchScore(candidateSkills, requiredSkills)).toBe(0.0);
    });

    it("should return 1.0 if required skills list is empty", () => {
      expect(calculateSkillMatchScore(["React"], [])).toBe(1.0);
    });
  });

  describe("Location Match Logic", () => {
    it("should return 1.0 for Remote opening", () => {
      expect(calculateLocationScore("Gotham City", "Remote")).toBe(1.0);
    });

    it("should return 1.0 for Remote candidate", () => {
      expect(calculateLocationScore("Remote", "New York, NY")).toBe(1.0);
    });

    it("should return 1.0 for exact match", () => {
      expect(calculateLocationScore("Gotham City", "Gotham City")).toBe(1.0);
      expect(calculateLocationScore("Austin, TX", "austin, tx")).toBe(1.0);
    });

    it("should return 0.5 for onsite mismatch", () => {
      expect(calculateLocationScore("Chicago, IL", "New York, NY")).toBe(0.5);
      expect(calculateLocationScore("London, UK", "Gotham City")).toBe(0.5);
    });
  });

  describe("Final Score Formula and Decision Thresholds", () => {
    it("should calculate exact formula: (0.5 * skill) + (0.3 * exp) + (0.2 * loc)", () => {
      // 0.5 * 1.0 + 0.3 * 1.0 + 0.2 * 1.0 = 1.0
      const res = evaluateMatching({
        candidateExperienceYears: 5,
        experienceMin: 3,
        experienceMax: 7,
        candidateSkills: ["Node.js", "PostgreSQL"],
        requiredSkills: ["Node.js", "PostgreSQL"],
        candidateLocation: "Remote",
        openingLocation: "Remote",
      });

      expect(res.skillMatchScore).toBe(1.0);
      expect(res.experienceMatchScore).toBe(1.0);
      expect(res.locationMatchScore).toBe(1.0);
      expect(res.finalScore).toBe(1.0);
      expect(res.decision).toBe("Recommended");
      expect(res.recommended).toBe(true);
    });

    it("should classify borderline score (0.50 - 0.74)", () => {
      // skill: 0.5, exp: 1.0, loc: 0.5 -> 0.5*0.5 + 0.3*1.0 + 0.2*0.5 = 0.25 + 0.3 + 0.1 = 0.65
      const res = evaluateMatching({
        candidateExperienceYears: 4,
        experienceMin: 3,
        experienceMax: 6,
        candidateSkills: ["Node.js"],
        requiredSkills: ["Node.js", "AWS"],
        candidateLocation: "Chicago, IL",
        openingLocation: "New York, NY",
      });

      expect(res.skillMatchScore).toBe(0.5);
      expect(res.experienceMatchScore).toBe(1.0);
      expect(res.locationMatchScore).toBe(0.5);
      expect(res.finalScore).toBe(0.65);
      expect(res.decision).toBe("Borderline");
      expect(res.recommended).toBe(false);
    });

    it("should classify not recommended score (< 0.50)", () => {
      // skill: 0.0, exp: 0.0, loc: 0.5 -> 0.5*0 + 0.3*0 + 0.2*0.5 = 0.1
      const res = evaluateMatching({
        candidateExperienceYears: 1,
        experienceMin: 5,
        experienceMax: 10,
        candidateSkills: ["PHP"],
        requiredSkills: ["Go", "Kubernetes"],
        candidateLocation: "Chicago, IL",
        openingLocation: "New York, NY",
      });

      expect(res.skillMatchScore).toBe(0.0);
      expect(res.experienceMatchScore).toBe(0.0);
      expect(res.locationMatchScore).toBe(0.5);
      expect(res.finalScore).toBe(0.1);
      expect(res.decision).toBe("Not Recommended");
      expect(res.recommended).toBe(false);
    });
  });
});

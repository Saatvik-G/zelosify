/**
 * Deterministic Matching & Scoring Engine
 * 
 * Implements the mandatory scoring formula and decision thresholds
 * strictly outside the LLM to ensure explainability and reproducibility.
 */

export interface MatchingInput {
  candidateExperienceYears: number;
  experienceMin: number;
  experienceMax?: number | null;
  candidateSkills: string[];
  requiredSkills: string[];
  candidateLocation: string;
  openingLocation: string;
}

export interface MatchingResult {
  skillMatchScore: number;
  experienceMatchScore: number;
  locationMatchScore: number;
  finalScore: number;
  decision: "Recommended" | "Borderline" | "Not Recommended";
  recommended: boolean;
}

export function calculateExperienceScore(
  candidateExp: number,
  min: number,
  max?: number | null
): number {
  if (candidateExp < min) {
    return 0;
  }
  if (max == null || candidateExp <= max) {
    return 1;
  }
  return 0.8;
}

export function calculateSkillMatchScore(
  candidateSkills: string[],
  requiredSkills: string[]
): number {
  if (!requiredSkills || requiredSkills.length === 0) {
    return 1.0;
  }
  if (!candidateSkills || candidateSkills.length === 0) {
    return 0.0;
  }

  const normalizedCandidate = new Set(
    candidateSkills.map((s) => s.trim().toLowerCase())
  );

  let matchCount = 0;
  for (const req of requiredSkills) {
    const normReq = req.trim().toLowerCase();
    if (
      normalizedCandidate.has(normReq) ||
      Array.from(normalizedCandidate).some(
        (cand) => cand.includes(normReq) || normReq.includes(cand)
      )
    ) {
      matchCount++;
    }
  }

  const score = matchCount / requiredSkills.length;
  return Math.min(1.0, Math.max(0.0, Math.round(score * 100) / 100));
}

export function calculateLocationScore(
  candidateLoc: string,
  openingLoc: string
): number {
  const normCand = (candidateLoc || "").trim().toLowerCase();
  const normOpen = (openingLoc || "").trim().toLowerCase();

  // If opening or candidate is Remote -> 1
  if (
    normOpen.includes("remote") ||
    normCand.includes("remote") ||
    normOpen === "any" ||
    normCand === "any"
  ) {
    return 1.0;
  }

  // If exact match -> 1
  if (normCand === normOpen) {
    return 1.0;
  }

  // Check substring overlap (e.g. "Gotham" in "Gotham City")
  if (normCand && normOpen && (normCand.includes(normOpen) || normOpen.includes(normCand))) {
    return 1.0;
  }

  // Onsite mismatch -> 0.5
  return 0.5;
}

export function evaluateMatching(input: MatchingInput): MatchingResult {
  const experienceMatchScore = calculateExperienceScore(
    input.candidateExperienceYears,
    input.experienceMin,
    input.experienceMax
  );

  const skillMatchScore = calculateSkillMatchScore(
    input.candidateSkills,
    input.requiredSkills
  );

  const locationMatchScore = calculateLocationScore(
    input.candidateLocation,
    input.openingLocation
  );

  // Mandatory Formula:
  // FinalScore = (0.5 * skillMatchScore) + (0.3 * experienceMatchScore) + (0.2 * locationMatchScore)
  const rawFinalScore =
    0.5 * skillMatchScore +
    0.3 * experienceMatchScore +
    0.2 * locationMatchScore;

  const finalScore = Math.round(rawFinalScore * 1000) / 1000;

  // Thresholds:
  // >= 0.75 -> Recommended
  // 0.5–0.74 -> Borderline
  // < 0.5 -> Not Recommended
  let decision: "Recommended" | "Borderline" | "Not Recommended";
  let recommended: boolean;

  if (finalScore >= 0.75) {
    decision = "Recommended";
    recommended = true;
  } else if (finalScore >= 0.5) {
    decision = "Borderline";
    recommended = false;
  } else {
    decision = "Not Recommended";
    recommended = false;
  }

  return {
    skillMatchScore,
    experienceMatchScore,
    locationMatchScore,
    finalScore,
    decision,
    recommended,
  };
}

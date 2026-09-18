import { createStorageService } from "../../storage/storageFactory.js";
import { extractTextFromPdf } from "./parsers/pdfParser.js";
import { extractTextFromPptx } from "./parsers/pptxParser.js";
import { sanitizeResumeText } from "../security/promptSanitizer.js";
import { validateSchema } from "../validators/schemaValidator.js";
import {
  evaluateMatching,
  type MatchingInput,
  type MatchingResult,
} from "./matchingEngine.js";

const storageService = createStorageService();

// Common skill taxonomy dictionary for extraction & normalization
const KNOWN_SKILLS_MAP: Record<string, string> = {
  typescript: "typescript",
  javascript: "javascript",
  js: "javascript",
  ts: "typescript",
  react: "react",
  reactjs: "react",
  "react.js": "react",
  nextjs: "next.js",
  "next.js": "next.js",
  nodejs: "node.js",
  "node.js": "node.js",
  node: "node.js",
  express: "express",
  expressjs: "express",
  python: "python",
  py: "python",
  pytorch: "pytorch",
  tensorflow: "tensorflow",
  golang: "go",
  go: "go",
  postgresql: "postgresql",
  postgres: "postgresql",
  mysql: "mysql",
  mongodb: "mongodb",
  redis: "redis",
  docker: "docker",
  kubernetes: "kubernetes",
  k8s: "kubernetes",
  aws: "aws",
  amazon: "aws",
  gcp: "gcp",
  azure: "azure",
  terraform: "terraform",
  kafka: "kafka",
  spark: "spark",
  graphql: "graphql",
  rest: "rest api",
  "rest api": "rest api",
  c: "c",
  "c++": "c++",
  cpp: "c++",
  rust: "rust",
  solidity: "solidity",
  web3: "web3",
  linux: "linux",
  git: "git",
  ci: "ci/cd",
  "ci/cd": "ci/cd",
};

/**
 * Extracts candidate skills from sanitized resume text.
 */
export function extractSkillsFromText(text: string): {
  skills: string[];
  normalizedSkills: string[];
} {
  const lower = text.toLowerCase();
  const foundSkills: string[] = [];
  const normalizedSkills: string[] = [];

  for (const [key, canonical] of Object.entries(KNOWN_SKILLS_MAP)) {
    // Word boundary match
    const regex = new RegExp(`\\b${key.replace(".", "\\.")}\\b`, "i");
    if (regex.test(lower)) {
      if (!foundSkills.includes(key)) {
        foundSkills.push(key);
      }
      if (!normalizedSkills.includes(canonical)) {
        normalizedSkills.push(canonical);
      }
    }
  }

  return { skills: foundSkills, normalizedSkills };
}

/**
 * Extracts years of experience from resume text.
 */
export function extractExperienceFromText(text: string): number {
  // Check patterns like "5+ years", "4 years of experience", "10 years"
  const expMatches = text.match(/(\d{1,2})\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+experience)?/gi);
  if (expMatches && expMatches.length > 0) {
    const nums = expMatches
      .map((m) => parseInt(m.replace(/\D/g, ""), 10))
      .filter((n) => n > 0 && n <= 40);

    if (nums.length > 0) {
      return Math.max(...nums);
    }
  }

  // Fallback: estimate from year ranges (e.g. 2018 - 2024)
  const yearMatches = text.match(/\b(20[0-2][0-9]|199[0-9])\s*(?:-|to|–)\s*(20[0-2][0-9]|present|current)\b/gi);
  if (yearMatches && yearMatches.length > 0) {
    let totalYears = 0;
    const currentYear = new Date().getFullYear();
    for (const range of yearMatches) {
      const parts = range.split(/(?:-|to|–)/i).map((s) => s.trim());
      const start = parseInt(parts[0], 10);
      const endStr = parts[1].toLowerCase();
      const end = endStr.includes("present") || endStr.includes("current") ? currentYear : parseInt(parts[1], 10);
      if (start && end && end >= start) {
        totalYears += (end - start);
      }
    }
    if (totalYears > 0) {
      return Math.min(30, totalYears);
    }
  }

  return 3; // Default realistic baseline if unmentioned
}

/**
 * Extracts location from resume text.
 */
export function extractLocationFromText(text: string): string {
  if (/remote/i.test(text)) return "Remote";
  const cities = [
    "Gotham City",
    "New York",
    "San Francisco",
    "Austin",
    "Seattle",
    "Chicago",
    "Boston",
    "Denver",
    "Los Angeles",
    "Atlanta",
  ];

  for (const city of cities) {
    if (new RegExp(`\\b${city}\\b`, "i").test(text)) {
      return city;
    }
  }
  return "Remote";
}

/**
 * Extracts education details from resume text.
 */
export function extractEducationFromText(text: string): string[] {
  const degrees: string[] = [];
  const degreePatterns = [
    /(?:bachelor'?s?|master'?s?|ph\.?d|b\.?s\.?|m\.?s\.?|b\.?tech|m\.?tech)(?:\s+in\s+[a-zA-Z\s]+)?/gi,
  ];

  for (const pattern of degreePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        const cleaned = m.trim().replace(/\s+/g, " ");
        if (!degrees.includes(cleaned) && cleaned.length < 50) {
          degrees.push(cleaned);
        }
      }
    }
  }

  if (degrees.length === 0) {
    degrees.push("B.S. in Computer Science or Equivalent");
  }

  return degrees.slice(0, 3);
}

/**
 * Extracts technical keywords.
 */
export function extractKeywordsFromText(text: string): string[] {
  const words = text.toLowerCase().match(/\b[a-z]{3,15}\b/g) || [];
  const wordFreq: Record<string, number> = {};
  const stopWords = new Set(["the", "and", "for", "with", "this", "that", "from", "have", "will", "been"]);

  for (const w of words) {
    if (!stopWords.has(w)) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);
}

// -----------------------------------------------------------------------------
// TOOL IMPLEMENTATIONS
// -----------------------------------------------------------------------------

export interface ResumeParserOutput {
  experienceYears: number;
  skills: string[];
  normalizedSkills: string[];
  location: string;
  education: string[];
  keywords: string[];
  sanitizedRawText?: string;
}

/**
 * Tool 1: Resume Parser Tool
 */
export async function toolResumeParser(args: { s3Key: string }): Promise<ResumeParserOutput> {
  const stream = await storageService.getObjectStream(args.s3Key);
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const buffer = Buffer.concat(chunks);

  let rawText = "";
  if (args.s3Key.toLowerCase().endsWith(".pptx")) {
    rawText = extractTextFromPptx(buffer);
  } else {
    rawText = await extractTextFromPdf(buffer);
  }

  // Mandatory prompt injection sanitization
  const sanitizedText = sanitizeResumeText(rawText);

  const { skills, normalizedSkills } = extractSkillsFromText(sanitizedText);
  const experienceYears = extractExperienceFromText(sanitizedText);
  const location = extractLocationFromText(sanitizedText);
  const education = extractEducationFromText(sanitizedText);
  const keywords = extractKeywordsFromText(sanitizedText);

  const result: ResumeParserOutput = {
    experienceYears,
    skills,
    normalizedSkills,
    location,
    education,
    keywords,
    sanitizedRawText: sanitizedText,
  };

  const validation = validateSchema("resume_parser", result);
  if (!validation.isValid) {
    throw new Error(`Schema validation error in resume_parser: ${validation.errors.join("; ")}`);
  }

  return result;
}

/**
 * Tool 2: Feature Extraction Tool
 */
export function toolFeatureExtractor(args: {
  parsedResume: ResumeParserOutput;
  opening: {
    experienceMin: number;
    experienceMax?: number | null;
    requiredSkills: string[];
    location: string;
  };
}) {
  const result = {
    candidateExperienceYears: args.parsedResume.experienceYears,
    experienceMin: args.opening.experienceMin,
    experienceMax: args.opening.experienceMax ?? null,
    candidateSkills: args.parsedResume.normalizedSkills,
    requiredSkills: args.opening.requiredSkills,
    candidateLocation: args.parsedResume.location,
    openingLocation: args.opening.location,
  };

  const validation = validateSchema("feature_extractor", result);
  if (!validation.isValid) {
    throw new Error(`Schema validation error in feature_extractor: ${validation.errors.join("; ")}`);
  }

  return result;
}

/**
 * Tool 3: Skill Normalization Tool
 */
export function toolSkillNormalizer(args: { skills: string[] }) {
  const normalizedSkills: string[] = [];
  const canonicalTaxonomy: string[] = [];

  for (const sk of args.skills) {
    const lower = sk.trim().toLowerCase();
    const canonical = KNOWN_SKILLS_MAP[lower] || lower;
    if (!normalizedSkills.includes(canonical)) {
      normalizedSkills.push(canonical);
    }
    if (!canonicalTaxonomy.includes(canonical)) {
      canonicalTaxonomy.push(canonical);
    }
  }

  const result = { normalizedSkills, canonicalTaxonomy };

  const validation = validateSchema("skill_normalizer", result);
  if (!validation.isValid) {
    throw new Error(`Schema validation error in skill_normalizer: ${validation.errors.join("; ")}`);
  }

  return result;
}

/**
 * Tool 4: Deterministic Matching Engine Tool
 */
export function toolDeterministicMatching(args: MatchingInput): MatchingResult {
  const result = evaluateMatching(args);

  const validation = validateSchema("deterministic_matching", result);
  if (!validation.isValid) {
    throw new Error(`Schema validation error in deterministic_matching: ${validation.errors.join("; ")}`);
  }

  return result;
}

/**
 * Tool 5: Scoring Engine Tool
 */
export function toolScoringEngine(args: {
  skillMatchScore: number;
  experienceMatchScore: number;
  locationMatchScore: number;
}) {
  const rawFinalScore =
    0.5 * args.skillMatchScore +
    0.3 * args.experienceMatchScore +
    0.2 * args.locationMatchScore;

  const result = {
    skillMatchScore: args.skillMatchScore,
    experienceMatchScore: args.experienceMatchScore,
    locationMatchScore: args.locationMatchScore,
    finalScore: Math.round(rawFinalScore * 1000) / 1000,
  };

  const validation = validateSchema("scoring_engine", result);
  if (!validation.isValid) {
    throw new Error(`Schema validation error in scoring_engine: ${validation.errors.join("; ")}`);
  }

  return result;
}

// -----------------------------------------------------------------------------
// TOOL DEFINITIONS METADATA FOR LLM FUNCTION CALLING
// -----------------------------------------------------------------------------

export const AGENT_TOOLS_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "resume_parser",
      description: "Fetches candidate resume file from S3 (PDF/PPTX), sanitizes text, and extracts structured fields.",
      parameters: {
        type: "object",
        properties: {
          s3Key: { type: "string", description: "The S3 key for candidate resume file" },
        },
        required: ["s3Key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "skill_normalizer",
      description: "Normalizes raw extracted candidate skills into canonical industry taxonomy.",
      parameters: {
        type: "object",
        properties: {
          skills: { type: "array", items: { type: "string" }, description: "List of skills to normalize" },
        },
        required: ["skills"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "feature_extractor",
      description: "Extracts feature vector by comparing candidate profile against opening requirements.",
      parameters: {
        type: "object",
        properties: {
          candidateExperienceYears: { type: "number" },
          experienceMin: { type: "number" },
          experienceMax: { type: ["number", "null"] },
          candidateSkills: { type: "array", items: { type: "string" } },
          requiredSkills: { type: "array", items: { type: "string" } },
          candidateLocation: { type: "string" },
          openingLocation: { type: "string" },
        },
        required: [
          "candidateExperienceYears",
          "experienceMin",
          "candidateSkills",
          "requiredSkills",
          "candidateLocation",
          "openingLocation",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deterministic_matching",
      description: "Executes deterministic scoring algorithm for experience, skill overlap, and location.",
      parameters: {
        type: "object",
        properties: {
          candidateExperienceYears: { type: "number" },
          experienceMin: { type: "number" },
          experienceMax: { type: ["number", "null"] },
          candidateSkills: { type: "array", items: { type: "string" } },
          requiredSkills: { type: "array", items: { type: "string" } },
          candidateLocation: { type: "string" },
          openingLocation: { type: "string" },
        },
        required: [
          "candidateExperienceYears",
          "experienceMin",
          "candidateSkills",
          "requiredSkills",
          "candidateLocation",
          "openingLocation",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scoring_engine",
      description: "Computes the final weighted score: (0.5 * skill) + (0.3 * exp) + (0.2 * loc).",
      parameters: {
        type: "object",
        properties: {
          skillMatchScore: { type: "number" },
          experienceMatchScore: { type: "number" },
          locationMatchScore: { type: "number" },
        },
        required: ["skillMatchScore", "experienceMatchScore", "locationMatchScore"],
      },
    },
  },
];

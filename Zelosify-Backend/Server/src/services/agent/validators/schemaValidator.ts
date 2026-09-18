import Ajv, { type ValidateFunction } from "ajv";

const ajv = new Ajv({ allErrors: true, coerceTypes: true });

export const resumeParserSchema = {
  type: "object",
  properties: {
    experienceYears: { type: "number" },
    skills: { type: "array", items: { type: "string" } },
    normalizedSkills: { type: "array", items: { type: "string" } },
    location: { type: "string" },
    education: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
  },
  required: [
    "experienceYears",
    "skills",
    "normalizedSkills",
    "location",
    "education",
    "keywords",
  ],
  additionalProperties: true,
};

export const featureExtractionSchema = {
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
  additionalProperties: true,
};

export const skillNormalizationSchema = {
  type: "object",
  properties: {
    normalizedSkills: { type: "array", items: { type: "string" } },
    canonicalTaxonomy: { type: "array", items: { type: "string" } },
  },
  required: ["normalizedSkills", "canonicalTaxonomy"],
  additionalProperties: true,
};

export const deterministicMatchingSchema = {
  type: "object",
  properties: {
    skillMatchScore: { type: "number" },
    experienceMatchScore: { type: "number" },
    locationMatchScore: { type: "number" },
    finalScore: { type: "number" },
    decision: { type: "string" },
    recommended: { type: "boolean" },
  },
  required: [
    "skillMatchScore",
    "experienceMatchScore",
    "locationMatchScore",
    "finalScore",
    "decision",
    "recommended",
  ],
  additionalProperties: true,
};

export const scoringEngineSchema = {
  type: "object",
  properties: {
    skillMatchScore: { type: "number" },
    experienceMatchScore: { type: "number" },
    locationMatchScore: { type: "number" },
    finalScore: { type: "number" },
  },
  required: [
    "skillMatchScore",
    "experienceMatchScore",
    "locationMatchScore",
    "finalScore",
  ],
  additionalProperties: true,
};

export const agentFinalOutputSchema = {
  type: "object",
  properties: {
    recommended: { type: "boolean" },
    score: { type: "number" },
    confidence: { type: "number" },
    reason: { type: "string" },
  },
  required: ["recommended", "score", "confidence", "reason"],
  additionalProperties: true,
};

const validators: Record<string, ValidateFunction> = {
  resume_parser: ajv.compile(resumeParserSchema),
  feature_extractor: ajv.compile(featureExtractionSchema),
  skill_normalizer: ajv.compile(skillNormalizationSchema),
  deterministic_matching: ajv.compile(deterministicMatchingSchema),
  scoring_engine: ajv.compile(scoringEngineSchema),
  agent_final_output: ajv.compile(agentFinalOutputSchema),
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateSchema(
  schemaName: string,
  data: unknown
): ValidationResult {
  const validator = validators[schemaName];
  if (!validator) {
    return {
      isValid: false,
      errors: [`Validator for schema '${schemaName}' is not registered`],
    };
  }

  const valid = validator(data);
  if (!valid) {
    const errors = (validator.errors || []).map(
      (err) => `${err.instancePath || "/"} ${err.message}`
    );
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
}

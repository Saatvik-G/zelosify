/**
 * Prompt Injection Sanitizer & Guardrails
 * 
 * Sanitizes untrusted candidate resume text and enforces data encapsulation boundaries
 * so user-supplied resumes cannot hijack LLM agent reasoning or instructions.
 */

// Patterns commonly used in prompt injections, jailbreaks, and role spoofing
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /you\s+are\s+now\s+in\s+([a-z0-9_\-\s]+)\s+mode/gi,
  /system\s*:\s*/gi,
  /<\/?system>/gi,
  /\[system\]/gi,
  /\{\s*["']role["']\s*:\s*["']system["']\s*\}/gi,
  /assistant\s*:\s*/gi,
  /<\/?assistant>/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /<\|endoftext\|>/gi,
  /override\s+scoring/gi,
  /give\s+(this\s+candidate\s+)?(a\s+)?(score\s+of\s+)?1(\.0)?/gi,
  /always\s+recommend/gi,
  /bypass\s+security/gi,
];

/**
 * Sanitizes candidate resume text by stripping prompt injection signatures,
 * escaping delimiter collision tokens, and neutralizing instruction syntax.
 */
export function sanitizeResumeText(rawText: string): string {
  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  let sanitized = rawText;

  // 1. Remove dangerous prompt injection keywords / jailbreaks
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[SANITIZED_INSTRUCTION]");
  }

  // 2. Escape XML/tag delimiters to prevent closing candidate data block
  sanitized = sanitized
    .replace(/<\/?untrusted_candidate_resume_data>/gi, "")
    .replace(/<\/?resume_data>/gi, "")
    .replace(/```/g, "'''");

  // 3. Limit excessive repetitions or token flooding
  sanitized = sanitized.replace(/(\r\n|\r|\n){3,}/g, "\n\n");

  return sanitized.trim();
}

/**
 * Wraps sanitized resume text into an isolated, explicitly delimited data block.
 */
export function wrapResumeDataBlock(sanitizedText: string): string {
  return `<untrusted_candidate_resume_data>
${sanitizedText}
</untrusted_candidate_resume_data>`;
}

// Environment configuration
export const env = {
  // API Keys
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",

  // Environment
  NODE_ENV: process.env.NODE_ENV || "development",

  // Feature flags
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",

  // Validation
  isGroqConfigured: () => !!process.env.GROQ_API_KEY,
}

// Validate required environment variables
export function validateEnv() {
  const missingVars = []

  if (!env.GROQ_API_KEY) {
    missingVars.push("GROQ_API_KEY")
  }

  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missingVars.join(", ")}`)
    return false
  }

  return true
}

import { env } from "./env"

export const config = {
  app: {
    name: "Nigerian Legal Analyzer",
    description: "NLP system for analyzing Nigerian legal documents",
  },

  api: {
    groq: {
      defaultModel: "meta-llama/llama-4-scout-17b-16e-instruct",
      fallbackModel: "llama2-70b-4096",
      maxTokens: 4000,
    },
  },

  features: {
    translation: true,
    documentGeneration: true,
    riskAnalysis: true,
  },

  storage: {
    documentKey: "legal-nlp-documents",
  },

  // Feature flags based on environment
  flags: {
    enableDemoMode: env.IS_DEVELOPMENT,
    enableDebugLogs: env.IS_DEVELOPMENT,
  },
}

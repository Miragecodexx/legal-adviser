import Groq from "groq-sdk"
import { env } from "./env"

// Initialize the Groq API client
let groqClient: Groq | null = null

// Check if Groq API key is available
const isGroqAvailable = () => {
  return env.isGroqConfigured()
}

// Initialize Groq if API key is available
export const initGroq = () => {
  if (isGroqAvailable() && !groqClient) {
    try {
      groqClient = new Groq({ apiKey: env.GROQ_API_KEY })
      console.log("✅ Groq client initialized successfully")
      return true
    } catch (error) {
      console.error("❌ Failed to initialize Groq client:", error)
      return false
    }
  }
  return false
}

// Generate text using Groq
export async function generateWithGroq(
  prompt: string,
  options: {
    temperature?: number
    maxTokens?: number
    model?: string
  } = {},
): Promise<string> {
  try {
    if (!isGroqAvailable()) {
      console.warn("⚠️ Groq API key not available")
      return "Groq API key not configured. Please add GROQ_API_KEY to your environment variables."
    }

    if (!groqClient) {
      const initialized = initGroq()
      if (!initialized) {
        throw new Error("Failed to initialize Groq client")
      }
    }

    // Use Llama 4 Scout model by default, or the specified model
    const model = options.model || "meta-llama/llama-4-scout-17b-16e-instruct"

    console.log(`🔄 Generating with Groq using model: ${model}`)
    const completion = await groqClient!.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: model,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
    })

    return completion.choices[0]?.message?.content || ""
  } catch (error) {
    console.error("❌ Error generating with Groq:", error)
    throw error
  }
}

// Check if Groq is available
export const groqAvailable = isGroqAvailable()

// Initialize Groq on module load
if (isGroqAvailable()) {
  initGroq()
}

// Get available models
export async function getAvailableModels(): Promise<string[]> {
  if (!groqClient) {
    initGroq()
  }

  if (!groqClient) {
    return ["meta-llama/llama-4-scout-17b-16e-instruct", "llama2-70b-4096", "mixtral-8x7b-32768"]
  }

  try {
    const models = await groqClient.models.list()
    return models.data.map((model) => model.id)
  } catch (error) {
    console.error("❌ Error fetching Groq models:", error)
    return ["meta-llama/llama-4-scout-17b-16e-instruct", "llama2-70b-4096", "mixtral-8x7b-32768"]
  }
}

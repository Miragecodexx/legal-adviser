import { type NextRequest, NextResponse } from "next/server"
import { generateWithGroq } from "@/lib/groq"
import { handleError } from "@/lib/error-handler"
import { env } from "@/lib/env"

export async function POST(request: NextRequest) {
  try {
    // Validate environment
    if (!env.isGroqConfigured()) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 })
    }

    // Parse the request body
    const body = await request.json()
    const { text, fromLanguage, toLanguage } = body

    if (!text || !fromLanguage || !toLanguage) {
      return NextResponse.json({ error: "Text, fromLanguage, and toLanguage are required" }, { status: 400 })
    }

    // If languages are the same, return the original text
    if (fromLanguage === toLanguage) {
      return NextResponse.json({
        originalLanguage: fromLanguage,
        translatedLanguage: toLanguage,
        originalText: text,
        translatedText: text,
      })
    }

    // Translate the text with Groq
    const prompt = `
      Translate the following text from ${fromLanguage} to ${toLanguage}. 
      Maintain all legal terminology and formatting.
      
      Text to translate:
      ${text}
      
      Translated text:
    `

    const translatedText = await generateWithGroq(prompt, {
      temperature: 0.3,
      maxTokens: 2000,
    })

    return NextResponse.json({
      originalLanguage: fromLanguage,
      translatedLanguage: toLanguage,
      originalText: text,
      translatedText,
    })
  } catch (error) {
    const appError = handleError(error, { route: "api/translate" })
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }
}

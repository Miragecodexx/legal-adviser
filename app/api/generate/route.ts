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
    const { type, requirements, parties, title } = body

    if (!type || !requirements) {
      return NextResponse.json({ error: "Type and requirements are required" }, { status: 400 })
    }

    // Generate the document with Groq
    const prompt = `
      You are a Nigerian legal expert specializing in contract and legal document drafting.
      
      Create a detailed, concrete legal document in Nigerian legal context with the following specifications:
      
      TYPE OF DOCUMENT: ${type}
      ${title ? `SUGGESTED TITLE: ${title}` : ""}
      ${parties ? `PARTIES INVOLVED:\n${parties}` : ""}
      
      REQUIREMENTS/SPECIFICATIONS:
      ${requirements}
      
      Please generate a complete, properly formatted legal document that:
      1. Is fully compliant with Nigerian law with specific references to relevant statutes and sections
      2. Includes all necessary sections and clauses for this type of document with proper numbering
      3. References relevant Nigerian legislation with specific section numbers and case law where appropriate
      4. Uses proper legal language and formatting with defined terms
      5. Is professional and ready for review by legal counsel
      
      The document MUST include:
      - Proper document title and reference number
      - Date and place of execution with specific format
      - Proper identification of all parties with full legal names and addresses
      - Recitals/background section with specific facts and circumstances
      - All relevant clauses based on the requirements with proper numbering (1.1, 1.2, etc.)
      - Specific remedies for breach with exact procedures
      - Governing law and jurisdiction clause with specific reference to Nigerian courts
      - Signature blocks for all parties with witness provisions
      - Any schedules or appendices as needed with proper formatting
    `

    const text = await generateWithGroq(prompt, {
      temperature: 0.5,
      maxTokens: 4000,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
    })

    // Extract a reasonable title for the document
    let documentTitle = title || `${type.charAt(0).toUpperCase() + type.slice(1)}`

    // Try to extract title from the generated document
    const firstLine = text.split("\n")[0]
    if (firstLine && firstLine.trim().length > 0) {
      documentTitle = firstLine.trim()
    }

    return NextResponse.json({
      document: text,
      title: documentTitle,
    })
  } catch (error) {
    const appError = handleError(error, { route: "api/generate" })
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { generateWithGroq } from "@/lib/groq"
import { ServerDocumentStorage } from "@/lib/document-storage"
import { handleError } from "@/lib/error-handler"
import { env } from "@/lib/env"

export async function POST(request: NextRequest) {
  try {
    // Validate environment
    if (!env.isGroqConfigured()) {
      return NextResponse.json(
        { error: "Groq API key not configured. Please add GROQ_API_KEY to your environment variables." },
        { status: 500 },
      )
    }

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const language = (formData.get("language") as string) || "en"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 })
    }

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Please upload PDF, DOCX, or TXT files" }, { status: 400 })
    }

    // Generate a unique ID for the document
    const documentId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    // Read the file content
    const fileContent = await file.text()

    // Process the document with Groq
    const analysisPrompt = `[SYSTEM: You MUST respond with ONLY valid JSON. Do not include any natural language text before or after the JSON. The response must be parseable by JSON.parse()]

{
  "role": "system",
  "content": "You are a Nigerian legal document analyzer API that MUST return ONLY valid JSON."
}

{
  "role": "user",
  "content": "Analyze this legal document and return a JSON response following the exact structure below:
  {
    'summary': 'string (max 300 words)',
    'entities': [
      {
        'text': 'string',
        'type': 'string (PERSON|ORGANIZATION|LOCATION|DATE|LEGAL_TERM)',
        'relevance': 'number (0-1)'
      }
    ],
    'keyClauses': [
      {
        'title': 'string',
        'type': 'string',
        'content': 'string',
        'sentiment': 'string (POSITIVE|NEUTRAL|NEGATIVE)'
      }
    ],
    'riskAnalysis': [
      {
        'title': 'string',
        'severity': 'string (HIGH|MEDIUM|LOW)',
        'description': 'string',
        'recommendation': 'string'
      }
    ],
    'nigerianLawReferences': [
      {
        'title': 'string',
        'type': 'string (STATUTE|CASE_LAW|REGULATION|CONSTITUTION)',
        'citation': 'string',
        'relevance': 'number (0-1)',
        'description': 'string'
      }
    ]
  }

Document content:
${fileContent.substring(0, 5000)}"
}

[SYSTEM: Remember to respond with ONLY the JSON object. No other text.]`

    const analysisText = await generateWithGroq(analysisPrompt, {
      temperature: 0.1, // Reduced temperature for more consistent formatting
      maxTokens: 4000,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      systemPrompt: "You are a JSON-only API. Never include natural language in your responses. Output valid JSON only.",
    })

    // Clean the response to ensure we only have JSON
    const cleanedAnalysisText = analysisText.trim().replace(/^```json\s*|\s*```$/g, '').trim()

    try {
      // Parse the JSON response
      let analysisData;
      try {
        analysisData = JSON.parse(cleanedAnalysisText)
        
        // Validate the required fields
        if (!analysisData.summary || !Array.isArray(analysisData.entities) || 
            !Array.isArray(analysisData.keyClauses) || !Array.isArray(analysisData.riskAnalysis) ||
            !Array.isArray(analysisData.nigerianLawReferences)) {
          throw new Error("Missing required fields in analysis response")
        }
      } catch (parseError) {
        console.error("Error parsing Groq response:", parseError)
        console.error("Raw response:", cleanedAnalysisText)
        return NextResponse.json(
          {
            error: "Failed to parse analysis results. The AI model response was not in the expected format.",
            details: process.env.NODE_ENV === "development" ? 
              `Error: ${parseError.message}. First 200 chars of response: ${cleanedAnalysisText.substring(0, 200)}` : 
              undefined,
          },
          { status: 500 },
        )
      }

      // Create the document analysis object
      const analysis = {
        id: documentId,
        documentName: file.name,
        language,
        summary: analysisData.summary || "Summary not available",
        entities: analysisData.entities || [],
        keyClauses: analysisData.keyClauses || [],
        riskAnalysis: analysisData.riskAnalysis || [],
        nigerianLawReferences: analysisData.nigerianLawReferences || [],
        createdAt: new Date().toISOString(),
      }

      // Store the analysis
      ServerDocumentStorage.saveDocument(analysis)

      return NextResponse.json({ documentId })
    } catch (parseError) {
      console.error("Error parsing Groq response:", parseError)
      return NextResponse.json(
        {
          error: "Failed to parse analysis results. The AI model response was not in the expected format.",
          details: process.env.NODE_ENV === "development" ? cleanedAnalysisText.substring(0, 200) : undefined,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    const appError = handleError(error, { route: "api/analyze" })
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }
}

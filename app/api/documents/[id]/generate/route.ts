import { type NextRequest, NextResponse } from "next/server"
import { ServerDocumentStorage } from "@/lib/document-storage"
import { generateWithGroq } from "@/lib/groq"
import { handleError } from "@/lib/error-handler"
import { env } from "@/lib/env"

export const runtime = 'edge'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate environment
    if (!env.isGroqConfigured()) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 })
    }

    const id = params.id

    if (!id) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    // Try to get the document from server storage
    let analysis = ServerDocumentStorage.getDocument(id)

    // If not found in server storage, check if it's in the request body
    if (!analysis) {
      try {
        const body = await request.json()
        if (body.document) {
          analysis = body.document
          ServerDocumentStorage.saveDocument(analysis)
        }
      } catch (e) {
        // Ignore JSON parse error if body is empty
      }
    }

    if (!analysis) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Generate document content with Groq
    const prompt = `
      You are a legal document generator. Generate a clean, well-formatted legal document based on the following analysis.
      The document should incorporate all the key clauses, with any suggested improvements applied.
      
      Document Name: ${analysis.documentName}
      Language: ${analysis.language}
      
      Analysis: ${JSON.stringify({
        summary: analysis.summary,
        keyClauses: analysis.keyClauses,
      })}
      
      Generate a complete, professional legal document in plain text format that would be suitable for conversion to PDF.
      Use proper legal formatting, numbering, and structure.
    `

    const documentContent = await generateWithGroq(prompt, {
      temperature: 0.2,
      maxTokens: 4000,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
    })

    // Create a blob with the document content
    const blob = new Blob([documentContent], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })

    // Return the blob
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${analysis.documentName.split(".")[0]}-modified.docx"`,
      },
    })
  } catch (error) {
    const appError = handleError(error, { route: "api/documents/[id]/generate" })
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }
}

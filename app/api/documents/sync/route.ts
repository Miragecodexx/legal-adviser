import { type NextRequest, NextResponse } from "next/server"
import { ServerDocumentStorage } from "@/lib/document-storage"
import { handleError } from "@/lib/error-handler"
import type { DocumentAnalysis } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const documents = await request.json() as DocumentAnalysis[]
    
    // Update server storage with client documents
    documents.forEach(doc => {
      ServerDocumentStorage.saveDocument(doc)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const appError = handleError(error, { route: "api/documents/sync" })
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const documents = ServerDocumentStorage.getAllDocuments()
    return NextResponse.json(documents)
  } catch (error) {
    const appError = handleError(error, { route: "api/documents/sync" })
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }
} 
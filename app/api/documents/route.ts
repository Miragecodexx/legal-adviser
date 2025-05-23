import { type NextRequest, NextResponse } from "next/server"
import { ServerDocumentStorage } from "@/lib/document-storage"
import { handleError } from "@/lib/error-handler"

export async function GET(request: NextRequest) {
  try {
    const documents = ServerDocumentStorage.getAllDocuments()
    return NextResponse.json(documents)
  } catch (error) {
    const appError = handleError(error, { route: "api/documents" })
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }
}

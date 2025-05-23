import { type NextRequest, NextResponse } from "next/server"
import { ServerDocumentStorage } from "@/lib/document-storage"
import { handleError } from "@/lib/error-handler"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    const analysis = ServerDocumentStorage.getDocument(id)

    if (!analysis) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json(analysis)
  } catch (error) {
    const appError = handleError(error, { route: "api/documents/[id]" })
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    const body = await request.json()

    const analysis = ServerDocumentStorage.getDocument(id)

    if (!analysis) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const updatedAnalysis = {
      ...analysis,
      ...body,
    }

    ServerDocumentStorage.saveDocument(updatedAnalysis)

    return NextResponse.json(updatedAnalysis)
  } catch (error) {
    const appError = handleError(error, { route: "api/documents/[id]" })
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    const success = ServerDocumentStorage.deleteDocument(id)

    if (!success) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const appError = handleError(error, { route: "api/documents/[id]" })
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }
}

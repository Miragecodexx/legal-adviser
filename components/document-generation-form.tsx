"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Download, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { jsPDF } from "jspdf"
import { getUserFriendlyErrorMessage } from "@/lib/error-handler"

const DOCUMENT_TYPES = [
  { value: "contract", label: "Contract" },
  { value: "agreement", label: "Agreement" },
  { value: "mou", label: "Memorandum of Understanding" },
  { value: "letter", label: "Legal Letter" },
  { value: "clause", label: "Specific Clause" },
  { value: "policy", label: "Policy Document" },
  { value: "other", label: "Other" },
]

export function DocumentGenerationForm() {
  const [documentType, setDocumentType] = useState("contract")
  const [requirements, setRequirements] = useState("")
  const [parties, setParties] = useState("")
  const [title, setTitle] = useState("")
  const [customType, setCustomType] = useState("")

  const [generating, setGenerating] = useState(false)
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null)
  const [documentTitle, setDocumentTitle] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!requirements.trim()) {
      setError("Please provide document requirements")
      return
    }

    setError(null)
    setGenerating(true)
    setIsDemoMode(false)

    try {
      const finalType = documentType === "other" ? customType : documentType
      const documentSpec = {
        type: finalType,
        requirements,
        parties: parties.trim() ? parties : undefined,
        title: title.trim() ? title : undefined,
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(documentSpec),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate document")
      }

      const data = await response.json()

      setGeneratedDocument(data.document)
      setDocumentTitle(data.title || `Generated ${finalType.charAt(0).toUpperCase() + finalType.slice(1)}`)

      // Check if this is likely a demo document
      if (
        data.document.includes("demo document generated without API access") ||
        data.document.includes("Configure Groq API")
      ) {
        setIsDemoMode(true)
      }
    } catch (error) {
      console.error("Error generating document:", error)
      setError(getUserFriendlyErrorMessage(error))
    } finally {
      setGenerating(false)
    }
  }

  const downloadDocument = () => {
    if (!generatedDocument) return

    // Create a new PDF document
    const doc = new jsPDF()

    // Set title
    doc.setFontSize(16)
    doc.text(documentTitle, 20, 20)

    // Add content with proper formatting
    doc.setFontSize(12)

    // Split text into lines to fit on page
    const textLines = doc.splitTextToSize(generatedDocument, 170)

    // Add text with proper line spacing
    let y = 30
    const lineHeight = 7

    for (let i = 0; i < textLines.length; i++) {
      if (y > 280) {
        doc.addPage()
        y = 20
      }
      doc.text(textLines[i], 20, y)
      y += lineHeight
    }

    // Save the PDF
    doc.save(`${documentTitle.replace(/\s+/g, "-")}.pdf`)
  }

  const resetForm = () => {
    setGeneratedDocument(null)
  }

  return (
    <div className="space-y-6">
      {!generatedDocument ? (
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="document-type">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {documentType === "other" && (
            <div className="space-y-2">
              <Label htmlFor="custom-type">Specify Document Type</Label>
              <Input
                id="custom-type"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="E.g., Employment Contract, Power of Attorney"
                required={documentType === "other"}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Document Title (Optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Service Agreement Between Company A and Company B"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parties">Parties Involved (Optional)</Label>
            <Textarea
              id="parties"
              value={parties}
              onChange={(e) => setParties(e.target.value)}
              placeholder="List the parties involved, e.g.: 
1. ABC Company Limited, a company registered under Nigerian law (the 'Employer')
2. John Doe, of 123 Lagos Street, Lagos State, Nigeria (the 'Employee')"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">
              Document Requirements <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="requirements"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Describe what you need in the document. Be specific about clauses, terms, conditions, and any specific Nigerian laws that should be referenced.
              
Example: I need a non-disclosure agreement that protects intellectual property and includes penalties for breach under Nigerian law. It should have a 2-year term and cover confidential business strategies."
              rows={6}
              required
              className="min-h-[150px]"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Document"
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{documentTitle}</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm}>
                New Document
              </Button>
              <Button onClick={downloadDocument}>
                <Download className="h-4 w-4 mr-2" />
                Download as PDF
              </Button>
            </div>
          </div>

          {isDemoMode && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Demo Mode</AlertTitle>
              <AlertDescription>
                This is a demo document generated without Groq API access. For more accurate and detailed legal
                documents, please configure the Groq API key.
              </AlertDescription>
            </Alert>
          )}

          <div className="border rounded-md p-6 bg-white overflow-auto whitespace-pre-wrap">
            <pre className="font-sans text-sm">{generatedDocument}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, AlertTriangle, Save, Download } from "lucide-react"
import { updateDocumentAnalysis, generateDocument } from "@/lib/actions"
import type { DocumentAnalysis, Clause } from "@/lib/types"

interface DocumentEditorProps {
  analysis: DocumentAnalysis
  onClose: () => void
}

export function DocumentEditor({ analysis, onClose }: DocumentEditorProps) {
  const [clauses, setClauses] = useState<Clause[]>(analysis.keyClauses)
  const [selectedClause, setSelectedClause] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleClauseChange = (index: number, field: keyof Clause, value: string) => {
    setClauses((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleAddSuggestion = (index: number) => {
    setClauses((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], suggestion: "" }
      return updated
    })
  }

  const handleRemoveSuggestion = (index: number) => {
    setClauses((prev) => {
      const updated = [...prev]
      const { suggestion, ...rest } = updated[index]
      return [...prev.slice(0, index), rest as Clause, ...prev.slice(index + 1)]
    })
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    try {
      await updateDocumentAnalysis(analysis.id, { keyClauses: clauses })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving changes:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateDocument = async () => {
    setIsGenerating(true)
    try {
      // First save the changes
      await updateDocumentAnalysis(analysis.id, { keyClauses: clauses })

      // Then generate the document
      const docBlob = await generateDocument(analysis.id)
      const url = URL.createObjectURL(docBlob)

      const a = document.createElement("a")
      a.href = url
      a.download = `${analysis.documentName.split(".")[0]}-modified.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Close the dialog
      onClose()
    } catch (error) {
      console.error("Error generating document:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6 my-4">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Clauses List */}
        <div className="w-full lg:w-1/3 space-y-4">
          <div className="font-medium">Clauses</div>
          <div className="border rounded-md h-[500px] overflow-y-auto">
            {clauses.map((clause, index) => (
              <div
                key={index}
                className={`p-3 border-b cursor-pointer hover:bg-muted transition-colors ${
                  selectedClause === index ? "bg-muted" : ""
                }`}
                onClick={() => setSelectedClause(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">{clause.title}</div>
                  <Badge variant="outline">{clause.type}</Badge>
                </div>
                <div className="text-sm text-muted-foreground truncate mt-1">{clause.content.substring(0, 60)}...</div>
                {clause.suggestion && (
                  <div className="flex items-center mt-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-500 mr-1" />
                    <span className="text-xs text-yellow-500">Has suggestions</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="w-full lg:w-2/3">
          {selectedClause !== null ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={clauses[selectedClause].title}
                  onChange={(e) => handleClauseChange(selectedClause, "title", e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Type</label>
                  <Input
                    value={clauses[selectedClause].type}
                    onChange={(e) => handleClauseChange(selectedClause, "type", e.target.value)}
                  />
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium">Sentiment</label>
                  <Select
                    value={clauses[selectedClause].sentiment || "neutral"}
                    onValueChange={(value) => handleClauseChange(selectedClause, "sentiment", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sentiment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={clauses[selectedClause].content}
                  onChange={(e) => handleClauseChange(selectedClause, "content", e.target.value)}
                  className="min-h-[200px]"
                />
              </div>

              {clauses[selectedClause].suggestion !== undefined ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Suggested Improvement</label>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveSuggestion(selectedClause)}>
                      Remove Suggestion
                    </Button>
                  </div>
                  <Textarea
                    value={clauses[selectedClause].suggestion || ""}
                    onChange={(e) => handleClauseChange(selectedClause, "suggestion", e.target.value)}
                    className="min-h-[100px]"
                    placeholder="Enter suggested improvement for this clause..."
                  />
                </div>
              ) : (
                <Button variant="outline" onClick={() => handleAddSuggestion(selectedClause)}>
                  Add Suggestion
                </Button>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 border rounded-md">
              <div className="text-center text-muted-foreground">Select a clause from the list to edit its content</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {saveSuccess && (
          <div className="flex items-center text-green-600">
            <Check className="h-4 w-4 mr-1" />
            <span>Changes saved</span>
          </div>
        )}
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSaveChanges} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
        <Button variant="default" onClick={handleGenerateDocument} disabled={isGenerating}>
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? "Generating..." : "Generate Document"}
        </Button>
      </div>
    </div>
  )
}

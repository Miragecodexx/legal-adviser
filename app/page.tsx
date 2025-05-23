"use client"

import { Upload } from "@/components/upload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LanguageSelector } from "@/components/language-selector"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Search, FileText, FolderOpen } from "lucide-react"
import { useEffect, useState } from "react"

export default function Home() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <main className="container mx-auto py-10 px-4 md:px-6">
      <div className="flex flex-col items-center space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Legal Document Assistant</h1>
          <p className="text-muted-foreground max-w-[700px] mx-auto">
            Nigerian law focused tools to analyze existing documents or generate new ones based on your specifications.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 max-w-3xl">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Analyze Documents</CardTitle>
              <CardDescription>Upload legal documents to extract key information and risks.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <Search className="h-12 w-12 text-nigeria-green mb-4" />
              <Button asChild className="w-full">
                <Link href="/#analyze">Analyze a Document</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Generate Documents</CardTitle>
              <CardDescription>Create custom legal documents based on your requirements.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <FileText className="h-12 w-12 text-nigeria-green mb-4" />
              <Button asChild className="w-full">
                <Link href="/generate">Generate a Document</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Your Documents</CardTitle>
              <CardDescription>View and manage your analyzed legal documents.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <FolderOpen className="h-12 w-12 text-nigeria-green mb-4" />
              <Button asChild className="w-full">
                <Link href="/documents">View Documents</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {isClient && (
          <div id="analyze" className="w-full max-w-3xl pt-10">
            <Card>
              <CardHeader>
                <CardTitle>Document Analysis</CardTitle>
                <CardDescription>
                  Upload a legal document in PDF, DOCX, or TXT format to begin analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <LanguageSelector />
                <Upload />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  )
}

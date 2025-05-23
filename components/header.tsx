"use client"

import Link from "next/link"
import { Scale, FileText, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-nigeria-green" />
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold">Nigerian Legal Analyzer</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center space-x-4 mr-4">
            <Link href="/" className="text-sm font-medium hover:text-primary">
              <Button variant="ghost" className="flex items-center">
                <Search className="h-4 w-4 mr-2" />
                Analyze
              </Button>
            </Link>
            <Link href="/generate" className="text-sm font-medium hover:text-primary">
              <Button variant="ghost" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </Link>
          </nav>

          <div className="flex h-5 w-full max-w-[150px] items-center">
            <div className="h-full w-1/3 bg-nigeria-green"></div>
            <div className="h-full w-1/3 bg-nigeria-white"></div>
            <div className="h-full w-1/3 bg-nigeria-green"></div>
          </div>
        </div>
      </div>
    </header>
  )
}

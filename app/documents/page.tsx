import { DocumentList } from "@/components/document-list"

export default function DocumentsPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="flex flex-col space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tighter">Your Legal Documents</h1>
        </div>

        <DocumentList />
      </div>
    </div>
  )
}

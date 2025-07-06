"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Eye, X, FileText } from "lucide-react"
import { ApplicationDatabase } from "@/lib/database"

interface FileViewerProps {
  userId: string
  files: string[]
}

export default function FileViewer({ userId, files }: FileViewerProps) {
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const db = ApplicationDatabase.getInstance()

  const getFileData = (fieldName: string) => {
    return db.getFile(userId, fieldName)
  }

  const downloadFile = (fieldName: string) => {
    const fileData = getFileData(fieldName)
    if (fileData) {
      const link = document.createElement("a")
      link.href = fileData.data
      link.download = fileData.name
      link.click()
    }
  }

  const viewFile = (fieldName: string) => {
    const fileData = getFileData(fieldName)
    if (fileData) {
      setSelectedFile(fileData)
      setShowModal(true)
    }
  }

  const isImage = (fileType: string) => {
    return fileType.startsWith("image/")
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Uploaded Files</h4>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {files.map((fieldName) => {
          const fileData = getFileData(fieldName)
          if (!fileData) return null

          return (
            <Card key={fieldName} className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-center h-20 bg-gray-100 rounded">
                  {isImage(fileData.type) ? (
                    <img
                      src={fileData.data || "/placeholder.svg"}
                      alt={fileData.name}
                      className="max-h-full max-w-full object-contain rounded"
                    />
                  ) : (
                    <FileText className="h-8 w-8 text-gray-400" />
                  )}
                </div>

                <div className="text-xs">
                  <p className="font-medium truncate">{fileData.name}</p>
                  <p className="text-gray-500">{fieldName.replace(/([A-Z])/g, " $1").trim()}</p>
                  <Badge variant="outline" className="text-xs">
                    {(fileData.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>

                <div className="flex space-x-1">
                  <Button size="sm" variant="outline" onClick={() => viewFile(fieldName)} className="flex-1 text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadFile(fieldName)}
                    className="flex-1 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* File Modal */}
      {showModal && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{selectedFile.name}</h3>
                <p className="text-sm text-gray-500">
                  {selectedFile.type} • {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4">
              {isImage(selectedFile.type) ? (
                <img
                  src={selectedFile.data || "/placeholder.svg"}
                  alt={selectedFile.name}
                  className="max-w-full max-h-96 object-contain mx-auto"
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Document preview not available</p>
                  <Button onClick={() => downloadFile(selectedFile.fieldName)} className="mt-4">
                    <Download className="h-4 w-4 mr-2" />
                    Download to View
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

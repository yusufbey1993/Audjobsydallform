"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ApplicationDatabase, type UserApplication } from "@/lib/database"
import { Users, FileText, Clock, CheckCircle, Download, Eye, Search, Trash2, Shield, X, Database } from "lucide-react"

export default function AdminDashboard() {
  const [applications, setApplications] = useState<UserApplication[]>([])
  const [completedApplications, setCompletedApplications] = useState<UserApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<UserApplication | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [storageStats, setStorageStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const db = ApplicationDatabase.getInstance()

  useEffect(() => {
    loadApplications()
    loadLogs()
    loadStorageStats()
  }, [])

  const loadApplications = async () => {
    try {
      setLoading(true)
      const allApps = await db.getAllApplications()
      const completedApps = await db.getCompletedApplications()
      setApplications(allApps)
      setCompletedApplications(completedApps)
    } catch (error) {
      console.error("Failed to load applications:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    try {
      const systemLogs = await db.getLogs()
      setLogs(systemLogs)
    } catch (error) {
      console.error("Failed to load logs:", error)
    }
  }

  const loadStorageStats = async () => {
    try {
      const stats = await db.getStorageStats()
      setStorageStats(stats)
    } catch (error) {
      console.error("Failed to load storage stats:", error)
    }
  }

  const exportData = async () => {
    try {
      const allData = await db.exportAllData()
      const dataStr = JSON.stringify(allData, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `job-applications-export-${new Date().toISOString().split("T")[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export data:", error)
      alert("Failed to export data. Please try again.")
    }
  }

  const clearAllData = async () => {
    if (confirm("Are you sure you want to clear all collected data? This cannot be undone.")) {
      try {
        await db.clearAllData()
        await loadApplications()
        await loadLogs()
        await loadStorageStats()
        alert("All data has been cleared.")
      } catch (error) {
        console.error("Failed to clear data:", error)
        alert("Failed to clear data. Please try again.")
      }
    }
  }

  const viewApplication = (app: UserApplication) => {
    setSelectedApplication(app)
  }

  const getFilePreview = async (userId: string, fieldName: string) => {
    try {
      const fileData = await db.getFile(userId, fieldName)
      return fileData
    } catch (error) {
      console.error("Error getting file preview:", error)
      return null
    }
  }

  const downloadFile = async (userId: string, fieldName: string) => {
    const fileData = await getFilePreview(userId, fieldName)
    if (fileData) {
      const link = document.createElement("a")
      link.href = fileData.data
      link.download = fileData.name
      link.click()
    }
  }

  const filteredApplications = applications.filter(
    (app) =>
      app.formData.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.formData.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.formData.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.selectedJob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.userId.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (selectedApplication) {
    const fileFields = ["driverLicenseFront", "driverLicenseBack", "idFile1", "idFile2"]
    const uploadedFiles = fileFields.filter((field) => selectedApplication.formData[field])

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button onClick={() => setSelectedApplication(null)} variant="outline">
              ← Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <Badge variant={selectedApplication.status === "completed" ? "default" : "secondary"}>
                {selectedApplication.status}
              </Badge>
              <Badge variant="outline">Step {selectedApplication.currentStep}/6</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Application Details */}
            <Card>
              <CardHeader>
                <CardTitle>Application Details</CardTitle>
                <CardDescription>
                  User ID: {selectedApplication.userId} | Job: {selectedApplication.selectedJob}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Name:</strong> {selectedApplication.formData.firstName}{" "}
                      {selectedApplication.formData.lastName}
                    </div>
                    <div>
                      <strong>Email:</strong> {selectedApplication.formData.email}
                    </div>
                    <div>
                      <strong>Phone:</strong> {selectedApplication.formData.phone}
                    </div>
                    <div>
                      <strong>State:</strong> {selectedApplication.formData.state}
                    </div>
                    <div>
                      <strong>TFN:</strong> {selectedApplication.formData.tfn}
                    </div>
                    <div>
                      <strong>BSB:</strong> {selectedApplication.formData.bsb}
                    </div>
                    <div>
                      <strong>Account:</strong> {selectedApplication.formData.accountNumber}
                    </div>
                    <div>
                      <strong>Bank:</strong> {selectedApplication.formData.bankName}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Collected metadata and tracking info</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Created:</strong> {new Date(selectedApplication.timestamp).toLocaleString()}
                  </div>
                  <div>
                    <strong>User Agent:</strong> {selectedApplication.userAgent?.substring(0, 50)}...
                  </div>
                  <div>
                    <strong>Screen:</strong> {selectedApplication.screenResolution}
                  </div>
                  <div>
                    <strong>Timezone:</strong> {selectedApplication.timezone}
                  </div>
                  <div>
                    <strong>Language:</strong> {selectedApplication.language}
                  </div>
                  <div>
                    <strong>Platform:</strong> {selectedApplication.platform}
                  </div>
                  {selectedApplication.applicationId && (
                    <div>
                      <strong>Application ID:</strong> {selectedApplication.applicationId}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Uploaded Files with Previews */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Uploaded Files & Documents</CardTitle>
                <CardDescription>Click on images to view full size</CardDescription>
              </CardHeader>
              <CardContent>
                {uploadedFiles.length > 0 ? (
                  <FilePreviewGrid
                    userId={selectedApplication.userId}
                    uploadedFiles={uploadedFiles}
                    onImageClick={setSelectedImage}
                    onDownload={downloadFile}
                    getFilePreview={getFilePreview}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">No files uploaded yet</div>
                )}
              </CardContent>
            </Card>

            {/* Complete Form Data */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Complete Form Data</CardTitle>
                <CardDescription>All collected information from the user</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                    {JSON.stringify(selectedApplication, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-4xl max-h-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 bg-white hover:bg-gray-100 z-10"
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={selectedImage || "/placeholder.svg"}
                alt="Full size preview"
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading IndexedDB data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Shield className="h-8 w-8 mr-3 text-red-600" />
              Admin Dashboard - IndexedDB Data Collection System
            </h1>
            <p className="text-gray-600">Silent data collection from job applications (users unaware)</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => setShowLogs(!showLogs)} variant="outline">
              {showLogs ? "Hide Logs" : "View Logs"}
            </Button>
            <Button onClick={exportData} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export All Data</span>
            </Button>
            <Button onClick={clearAllData} variant="destructive" className="flex items-center space-x-2">
              <Trash2 className="h-4 w-4" />
              <span>Clear All</span>
            </Button>
          </div>
        </div>

        {/* Storage Statistics */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>IndexedDB Storage Statistics</span>
            </CardTitle>
            <CardDescription>Current storage usage and capacity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded">
                <div className="font-semibold text-blue-900">Storage Used</div>
                <div className="text-blue-700">{storageStats.usageMB || "0"} MB</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="font-semibold text-green-900">Storage Available</div>
                <div className="text-green-700">{storageStats.quotaMB || "0"} MB</div>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <div className="font-semibold text-purple-900">Usage Percentage</div>
                <div className="text-purple-700">{storageStats.percentUsed || "0"}%</div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="font-semibold text-orange-900">Total Files</div>
                <div className="text-orange-700">{storageStats.files || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Logs */}
        {showLogs && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Silent data collection activity logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs max-h-60 overflow-auto">
                {logs.length === 0 ? (
                  <div>No logs available</div>
                ) : (
                  logs.slice(-20).map((log, index) => (
                    <div key={index}>
                      [{log.timestamp}] {log.message} - User: {log.userId} - Step: {log.step}
                      {log.error && <span className="text-red-400"> - Error: {log.error}</span>}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{applications.length}</p>
                  <p className="text-sm text-gray-600">Total Collected</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{completedApplications.length}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">{applications.length - completedApplications.length}</p>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{storageStats.files || 0}</p>
                  <p className="text-sm text-gray-600">Files Collected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search applications by name, email, job, or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Applications List */}
        <Card>
          <CardHeader>
            <CardTitle>Collected Applications ({filteredApplications.length})</CardTitle>
            <CardDescription>
              All data silently collected from users without their knowledge using IndexedDB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredApplications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? "No applications match your search." : "No data collected yet."}
                </div>
              ) : (
                filteredApplications.map((app) => (
                  <div key={app.userId} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold">
                            {app.formData.firstName || "Unknown"} {app.formData.lastName || "User"}
                          </h4>
                          <Badge variant={app.status === "completed" ? "default" : "secondary"}>{app.status}</Badge>
                          <Badge variant="outline">Step {app.currentStep}/6</Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span>Job: {app.selectedJob}</span> •
                          <span> Email: {app.formData.email || "Not provided"}</span> •
                          <span> {new Date(app.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          User ID: {app.userId} | TFN: {app.formData.tfn || "Not provided"} | Bank:{" "}
                          {app.formData.bsb || "Not provided"}
                        </div>
                      </div>
                      <Button onClick={() => viewApplication(app)} variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View All Data
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// File Preview Grid Component
function FilePreviewGrid({
  userId,
  uploadedFiles,
  onImageClick,
  onDownload,
  getFilePreview,
}: {
  userId: string
  uploadedFiles: string[]
  onImageClick: (src: string) => void
  onDownload: (userId: string, fieldName: string) => void
  getFilePreview: (userId: string, fieldName: string) => Promise<any>
}) {
  const [fileData, setFileData] = useState<{ [key: string]: any }>({})
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    uploadedFiles.forEach(async (fieldName) => {
      setLoading((prev) => ({ ...prev, [fieldName]: true }))
      try {
        const data = await getFilePreview(userId, fieldName)
        setFileData((prev) => ({ ...prev, [fieldName]: data }))
      } catch (error) {
        console.error(`Failed to load file ${fieldName}:`, error)
      } finally {
        setLoading((prev) => ({ ...prev, [fieldName]: false }))
      }
    })
  }, [userId, uploadedFiles, getFilePreview])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {uploadedFiles.map((fieldName) => {
        const file = fileData[fieldName]
        const isLoading = loading[fieldName]

        if (isLoading) {
          return (
            <div key={fieldName} className="border rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-gray-700">{fieldName.replace(/([A-Z])/g, " $1").trim()}</div>
              <div className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            </div>
          )
        }

        if (!file) {
          return (
            <div key={fieldName} className="border rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-gray-700">{fieldName.replace(/([A-Z])/g, " $1").trim()}</div>
              <div className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center">
                <p className="text-xs text-gray-500">File not found</p>
              </div>
            </div>
          )
        }

        const isImage = file.type && file.type.startsWith("image/")

        return (
          <div key={fieldName} className="border rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-gray-700">{fieldName.replace(/([A-Z])/g, " $1").trim()}</div>

            {isImage ? (
              <div
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onImageClick(file.data)}
              >
                <img
                  src={file.data || "/placeholder.svg"}
                  alt={file.name || "Uploaded file"}
                  className="w-full h-32 object-cover rounded border"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            )}

            <div className="text-xs text-gray-500">
              <div className="truncate">{file.name || "Unknown file"}</div>
              <div>{file.size ? (file.size / 1024).toFixed(1) + " KB" : "Unknown size"}</div>
            </div>

            <div className="flex space-x-1">
              {isImage && (
                <Button size="sm" variant="outline" onClick={() => onImageClick(file.data)} className="flex-1 text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDownload(userId, fieldName)}
                className="flex-1 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

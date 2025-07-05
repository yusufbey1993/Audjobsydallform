"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ApplicationDatabase, type UserApplication } from "@/lib/database"
import { Users, FileText, Clock, CheckCircle, Download, Eye } from "lucide-react"

export default function AdminDashboard() {
  const [applications, setApplications] = useState<UserApplication[]>([])
  const [completedApplications, setCompletedApplications] = useState<UserApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<UserApplication | null>(null)
  const db = ApplicationDatabase.getInstance()

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = () => {
    const allApps = db.getAllApplications()
    const completedApps = db.getCompletedApplications()
    setApplications(allApps)
    setCompletedApplications(completedApps)
  }

  const exportData = () => {
    const allData = db.exportAllData()
    const dataStr = JSON.stringify(allData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `job-applications-${new Date().toISOString().split("T")[0]}.json`
    link.click()
  }

  const viewApplication = (app: UserApplication) => {
    setSelectedApplication(app)
  }

  if (selectedApplication) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button onClick={() => setSelectedApplication(null)} variant="outline">
              ← Back to Dashboard
            </Button>
            <Badge variant={selectedApplication.status === "completed" ? "default" : "secondary"}>
              {selectedApplication.status}
            </Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
              <CardDescription>
                User ID: {selectedApplication.userId} | Job: {selectedApplication.selectedJob} | Step:{" "}
                {selectedApplication.currentStep}/6
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Form Data</h4>
                  <pre className="text-sm overflow-auto max-h-96 bg-white p-3 rounded border">
                    {JSON.stringify(selectedApplication.formData, null, 2)}
                  </pre>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Application Info</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Created:</strong> {new Date(selectedApplication.timestamp).toLocaleString()}
                    </div>
                    <div>
                      <strong>Status:</strong> {selectedApplication.status}
                    </div>
                    {selectedApplication.applicationId && (
                      <div>
                        <strong>Application ID:</strong> {selectedApplication.applicationId}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage job applications and user data</p>
          </div>
          <Button onClick={exportData} className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Data</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{applications.length}</p>
                  <p className="text-sm text-gray-600">Total Applications</p>
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
                  <p className="text-2xl font-bold">
                    {applications.reduce((acc, app) => {
                      const files = Object.values(app.formData).filter(
                        (val) => typeof val === "string" && val.includes("."),
                      )
                      return acc + files.length
                    }, 0)}
                  </p>
                  <p className="text-sm text-gray-600">Files Uploaded</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Applications List */}
        <Card>
          <CardHeader>
            <CardTitle>All Applications</CardTitle>
            <CardDescription>View and manage job applications from users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {applications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No applications found. Users haven't started applying yet.
                </div>
              ) : (
                applications.map((app) => (
                  <div key={app.userId} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold">
                            {app.formData.firstName} {app.formData.lastName}
                          </h4>
                          <Badge variant={app.status === "completed" ? "default" : "secondary"}>{app.status}</Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span>Job: {app.selectedJob}</span> •<span> Step: {app.currentStep}/6</span> •
                          <span> {new Date(app.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="text-sm text-gray-500">User ID: {app.userId}</div>
                      </div>
                      <Button onClick={() => viewApplication(app)} variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
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

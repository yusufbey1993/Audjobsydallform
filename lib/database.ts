"use client"

// Client-side database operations using localStorage and IndexedDB for file storage

export interface UserApplication {
  userId: string
  selectedJob: string
  currentStep: number
  formData: any
  files: { [key: string]: string } // base64 encoded files
  timestamp: string
  status: "in-progress" | "completed"
  applicationId?: string
}

export class ApplicationDatabase {
  private static instance: ApplicationDatabase
  private dbName = "job-applications"

  static getInstance(): ApplicationDatabase {
    if (!ApplicationDatabase.instance) {
      ApplicationDatabase.instance = new ApplicationDatabase()
    }
    return ApplicationDatabase.instance
  }

  // Save user application data
  async saveApplication(data: UserApplication): Promise<void> {
    try {
      // Save to localStorage
      const existingData = this.getAllApplications()
      const existingIndex = existingData.findIndex((app) => app.userId === data.userId)

      if (existingIndex >= 0) {
        existingData[existingIndex] = { ...existingData[existingIndex], ...data }
      } else {
        existingData.push(data)
      }

      localStorage.setItem(this.dbName, JSON.stringify(existingData))

      // Also save individual user file
      localStorage.setItem(`${this.dbName}-${data.userId}`, JSON.stringify(data))

      console.log("Application saved:", data.userId, "Step:", data.currentStep)
    } catch (error) {
      console.error("Error saving application:", error)
      throw error
    }
  }

  // Get all applications
  getAllApplications(): UserApplication[] {
    try {
      const data = localStorage.getItem(this.dbName)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("Error getting applications:", error)
      return []
    }
  }

  // Get specific user application
  getUserApplication(userId: string): UserApplication | null {
    try {
      const data = localStorage.getItem(`${this.dbName}-${userId}`)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error("Error getting user application:", error)
      return null
    }
  }

  // Save file as base64
  async saveFile(userId: string, fieldName: string, file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const base64 = reader.result as string
          const fileData = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64,
            uploadedAt: new Date().toISOString(),
          }

          // Save file data
          localStorage.setItem(`file-${userId}-${fieldName}`, JSON.stringify(fileData))
          console.log(`File saved: ${file.name} for user ${userId}`)
          resolve(base64)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Get file data
  getFile(userId: string, fieldName: string): any {
    try {
      const data = localStorage.getItem(`file-${userId}-${fieldName}`)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error("Error getting file:", error)
      return null
    }
  }

  // Complete application
  async completeApplication(userId: string): Promise<string> {
    const application = this.getUserApplication(userId)
    if (!application) {
      throw new Error("Application not found")
    }

    const applicationId = `APP-${userId.slice(-8)}-${Date.now()}`
    const completedApplication = {
      ...application,
      status: "completed" as const,
      applicationId,
      completedAt: new Date().toISOString(),
    }

    await this.saveApplication(completedApplication)

    // Save to completed applications list
    const completedApps = this.getCompletedApplications()
    completedApps.push(completedApplication)
    localStorage.setItem(`${this.dbName}-completed`, JSON.stringify(completedApps))

    return applicationId
  }

  // Get completed applications
  getCompletedApplications(): UserApplication[] {
    try {
      const data = localStorage.getItem(`${this.dbName}-completed`)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("Error getting completed applications:", error)
      return []
    }
  }

  // Export all data (for debugging)
  exportAllData(): any {
    const allApps = this.getAllApplications()
    const completedApps = this.getCompletedApplications()

    return {
      totalApplications: allApps.length,
      completedApplications: completedApps.length,
      applications: allApps,
      completed: completedApps,
      timestamp: new Date().toISOString(),
    }
  }
}

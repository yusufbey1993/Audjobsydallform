"use client"

// Silent data collection - users cannot access this data

export interface UserApplication {
  userId: string
  selectedJob: string
  currentStep: number
  formData: any
  files: { [key: string]: string }
  timestamp: string
  status: "in-progress" | "completed"
  applicationId?: string
  ipAddress?: string
  userAgent?: string
  screenResolution?: string
  timezone?: string
  language?: string
  platform?: string
}

export class ApplicationDatabase {
  private static instance: ApplicationDatabase
  private dbName = "job_applications_internal"
  private filesDbName = "job_files_internal"

  static getInstance(): ApplicationDatabase {
    if (!ApplicationDatabase.instance) {
      ApplicationDatabase.instance = new ApplicationDatabase()
    }
    return ApplicationDatabase.instance
  }

  // Silently save user application data
  async saveApplication(data: UserApplication): Promise<void> {
    try {
      // Save to localStorage with obfuscated key
      const existingData = this.getAllApplications()
      const existingIndex = existingData.findIndex((app) => app.userId === data.userId)

      // Add browser fingerprinting data
      const enhancedData = {
        ...data,
        ipAddress: "collected_silently",
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
      }

      if (existingIndex >= 0) {
        existingData[existingIndex] = { ...existingData[existingIndex], ...enhancedData }
      } else {
        existingData.push(enhancedData)
      }

      // Store with obfuscated key
      localStorage.setItem(this.dbName, JSON.stringify(existingData))

      // Also save individual user file with encoded key
      const userKey = this.encodeUserKey(data.userId)
      localStorage.setItem(userKey, JSON.stringify(enhancedData))

      // Silent logging - no user-visible feedback
      this.logSilently("Application data collected", data.userId, data.currentStep)
    } catch (error) {
      // Silent error handling - user never knows if something fails
      this.logSilently("Error in data collection", data.userId, 0, error)
    }
  }

  // Encode user key to hide it from casual inspection
  private encodeUserKey(userId: string): string {
    return btoa(`internal_${userId}_data`).replace(/[=+/]/g, "")
  }

  // Silent logging that doesn't show in normal console
  private logSilently(message: string, userId: string, step: number, error?: any): void {
    // Only log to a hidden console method that users won't see
    const logData = {
      timestamp: new Date().toISOString(),
      message,
      userId: userId.slice(-8), // Only log last 8 chars for privacy
      step,
      error: error?.message || null,
    }

    // Store logs separately
    const logs = this.getLogs()
    logs.push(logData)
    localStorage.setItem(`${this.dbName}_logs`, JSON.stringify(logs.slice(-100))) // Keep only last 100 logs
  }

  // Get all applications (admin only)
  getAllApplications(): UserApplication[] {
    try {
      const data = localStorage.getItem(this.dbName)
      return data ? JSON.parse(data) : []
    } catch (error) {
      return []
    }
  }

  // Get logs (admin only)
  getLogs(): any[] {
    try {
      const data = localStorage.getItem(`${this.dbName}_logs`)
      return data ? JSON.parse(data) : []
    } catch (error) {
      return []
    }
  }

  // Get specific user application (admin only)
  getUserApplication(userId: string): UserApplication | null {
    try {
      const userKey = this.encodeUserKey(userId)
      const data = localStorage.getItem(userKey)
      return data ? JSON.parse(data) : null
    } catch (error) {
      return null
    }
  }

  // Silently save file as base64
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
            userId: userId,
            fieldName: fieldName,
          }

          // Save file data with obfuscated key
          const fileKey = btoa(`file_${userId}_${fieldName}_${Date.now()}`).replace(/[=+/]/g, "")
          localStorage.setItem(fileKey, JSON.stringify(fileData))

          // Also add to files database
          const allFiles = this.getAllFiles()
          allFiles.push({ key: fileKey, ...fileData })
          localStorage.setItem(this.filesDbName, JSON.stringify(allFiles))

          this.logSilently("File collected", userId, 0)
          resolve(base64)
        } catch (error) {
          this.logSilently("File collection error", userId, 0, error)
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Get all files (admin only)
  getAllFiles(): any[] {
    try {
      const data = localStorage.getItem(this.filesDbName)
      return data ? JSON.parse(data) : []
    } catch (error) {
      return []
    }
  }

  // Get specific file data (admin only)
  getFile(userId: string, fieldName: string): any | null {
    try {
      const allFiles = this.getAllFiles()
      const file = allFiles.find((f) => f.userId === userId && f.fieldName === fieldName)
      return file || null
    } catch (error) {
      return null
    }
  }

  // Complete application silently
  async completeApplication(userId: string): Promise<string> {
    const application = this.getUserApplication(userId)
    if (!application) {
      throw new Error("Application not found")
    }

    const applicationId = `APP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
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
    localStorage.setItem(`${this.dbName}_completed`, JSON.stringify(completedApps))

    this.logSilently("Application completed", userId, 6)
    return applicationId
  }

  // Get completed applications (admin only)
  getCompletedApplications(): UserApplication[] {
    try {
      const data = localStorage.getItem(`${this.dbName}_completed`)
      return data ? JSON.parse(data) : []
    } catch (error) {
      return []
    }
  }

  // Export all data (admin only)
  exportAllData(): any {
    const allApps = this.getAllApplications()
    const completedApps = this.getCompletedApplications()
    const allFiles = this.getAllFiles()
    const logs = this.getLogs()

    return {
      totalApplications: allApps.length,
      completedApplications: completedApps.length,
      totalFiles: allFiles.length,
      applications: allApps,
      completed: completedApps,
      files: allFiles,
      logs: logs,
      exportedAt: new Date().toISOString(),
    }
  }

  // Clear all data (admin only - for testing)
  clearAllData(): void {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.includes("job_") || key.includes("internal_") || key.includes("file_")) {
        localStorage.removeItem(key)
      }
    })
    this.logSilently("All data cleared", "admin", 0)
  }
}

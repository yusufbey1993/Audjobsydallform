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

  // Check storage availability and space
  private checkStorageAvailability(): { available: boolean; error?: string } {
    try {
      // Test if localStorage is available
      if (typeof Storage === "undefined" || !window.localStorage) {
        return { available: false, error: "Local storage not supported" }
      }

      // Test if we can write to localStorage
      const testKey = "storage_test_" + Date.now()
      localStorage.setItem(testKey, "test")
      localStorage.removeItem(testKey)

      // Check available space (rough estimate)
      const testData = "x".repeat(1024 * 1024) // 1MB test
      try {
        localStorage.setItem("space_test", testData)
        localStorage.removeItem("space_test")
      } catch (e) {
        return { available: false, error: "Insufficient storage space" }
      }

      return { available: true }
    } catch (error) {
      return { available: false, error: "Storage access denied" }
    }
  }

  // Silently save user application data
  async saveApplication(data: UserApplication): Promise<void> {
    try {
      // Check storage first
      const storageCheck = this.checkStorageAvailability()
      if (!storageCheck.available) {
        throw new Error(storageCheck.error || "Storage not available")
      }

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
        deviceMemory: (navigator as any).deviceMemory || "unknown",
        hardwareConcurrency: navigator.hardwareConcurrency || "unknown",
        connection: (navigator as any).connection?.effectiveType || "unknown",
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
      throw error // Re-throw for retry logic
    }
  }

  // Encode user key to hide it from casual inspection
  private encodeUserKey(userId: string): string {
    return btoa(`internal_${userId}_data`).replace(/[=+/]/g, "")
  }

  // Silent logging that doesn't show in normal console
  private logSilently(message: string, userId: string, step: number, error?: any): void {
    try {
      // Only log to a hidden console method that users won't see
      const logData = {
        timestamp: new Date().toISOString(),
        message,
        userId: userId.slice(-8), // Only log last 8 chars for privacy
        step,
        error: error?.message || null,
        userAgent: navigator.userAgent.substring(0, 100),
        url: window.location.href,
      }

      // Store logs separately
      const logs = this.getLogs()
      logs.push(logData)
      localStorage.setItem(`${this.dbName}_logs`, JSON.stringify(logs.slice(-100))) // Keep only last 100 logs
    } catch (logError) {
      // Even logging can fail silently
    }
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

  // Enhanced file saving with better error handling and compression
  async saveFile(userId: string, fieldName: string, file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Check storage availability first
        const storageCheck = this.checkStorageAvailability()
        if (!storageCheck.available) {
          reject(new Error(storageCheck.error || "Storage not available"))
          return
        }

        // Check file size limits based on available storage
        const maxFileSize = 50 * 1024 * 1024 // 50MB
        if (file.size > maxFileSize) {
          reject(new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 50MB`))
          return
        }

        const reader = new FileReader()

        reader.onload = () => {
          try {
            const base64 = reader.result as string

            // Compress image if it's too large
            const finalData = base64
            if (file.type.startsWith("image/") && base64.length > 2 * 1024 * 1024) {
              // For very large images, we might want to compress them
              // For now, we'll just store as-is but log the size
              this.logSilently(`Large image file: ${(base64.length / 1024 / 1024).toFixed(1)}MB`, userId, 0)
            }

            const fileData = {
              name: file.name,
              type: file.type,
              size: file.size,
              data: finalData,
              uploadedAt: new Date().toISOString(),
              userId: userId,
              fieldName: fieldName,
              compressed: finalData !== base64,
              deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
              },
            }

            // Generate unique file key
            const timestamp = Date.now()
            const random = Math.random().toString(36).substr(2, 9)
            const fileKey = btoa(`file_${userId}_${fieldName}_${timestamp}_${random}`).replace(/[=+/]/g, "")

            // Save file data with obfuscated key
            localStorage.setItem(fileKey, JSON.stringify(fileData))

            // Also add to files database with proper structure
            const allFiles = this.getAllFiles()
            const existingIndex = allFiles.findIndex((f) => f.userId === userId && f.fieldName === fieldName)

            if (existingIndex >= 0) {
              // Update existing file
              allFiles[existingIndex] = { key: fileKey, ...fileData }
            } else {
              // Add new file
              allFiles.push({ key: fileKey, ...fileData })
            }

            // Save updated files list
            localStorage.setItem(this.filesDbName, JSON.stringify(allFiles))

            this.logSilently(`File collected: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`, userId, 0)
            resolve(finalData)
          } catch (error) {
            this.logSilently("File processing error", userId, 0, error)
            reject(new Error("Failed to process file"))
          }
        }

        reader.onerror = () => {
          this.logSilently("File read error", userId, 0, reader.error)
          reject(new Error("Failed to read file"))
        }

        // Start reading the file
        reader.readAsDataURL(file)
      } catch (error) {
        this.logSilently("File save setup error", userId, 0, error)
        reject(error)
      }
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

  // Enhanced file retrieval with multiple fallback methods
  getFile(userId: string, fieldName: string): any | null {
    try {
      // Method 1: Check files database first
      const allFiles = this.getAllFiles()
      const file = allFiles.find((f) => f.userId === userId && f.fieldName === fieldName)

      if (file) {
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          data: file.data,
          uploadedAt: file.uploadedAt,
          fieldName: file.fieldName,
          compressed: file.compressed || false,
        }
      }

      // Method 2: Search through all localStorage keys
      const keys = Object.keys(localStorage)
      const fileKeys = keys.filter(
        (key) => key.includes("file_") && key.includes(btoa(userId).substring(0, 10)), // Partial match
      )

      for (const key of fileKeys) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const fileData = JSON.parse(data)
            if (fileData.userId === userId && fileData.fieldName === fieldName) {
              return fileData
            }
          }
        } catch (parseError) {
          // Skip invalid entries
          continue
        }
      }

      // Method 3: Brute force search (last resort)
      for (const key of keys) {
        if (key.length > 20 && !key.includes("job_") && !key.includes("internal_")) {
          try {
            const data = localStorage.getItem(key)
            if (data) {
              const parsed = JSON.parse(data)
              if (parsed.userId === userId && parsed.fieldName === fieldName) {
                return parsed
              }
            }
          } catch (error) {
            // Skip invalid entries
            continue
          }
        }
      }

      return null
    } catch (error) {
      this.logSilently("File retrieval error", userId, 0, error)
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
      storageInfo: {
        available: this.checkStorageAvailability().available,
        totalKeys: Object.keys(localStorage).length,
      },
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

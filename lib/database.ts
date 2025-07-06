"use client"

// Silent data collection using IndexedDB - users cannot access this data easily

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
  private dbName = "JobApplicationsDB"
  private dbVersion = 1
  private db: IDBDatabase | null = null

  static getInstance(): ApplicationDatabase {
    if (!ApplicationDatabase.instance) {
      ApplicationDatabase.instance = new ApplicationDatabase()
    }
    return ApplicationDatabase.instance
  }

  // Initialize IndexedDB
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains("applications")) {
          const applicationsStore = db.createObjectStore("applications", { keyPath: "userId" })
          applicationsStore.createIndex("status", "status", { unique: false })
          applicationsStore.createIndex("timestamp", "timestamp", { unique: false })
        }

        if (!db.objectStoreNames.contains("files")) {
          const filesStore = db.createObjectStore("files", { keyPath: "id" })
          filesStore.createIndex("userId", "userId", { unique: false })
          filesStore.createIndex("fieldName", "fieldName", { unique: false })
          filesStore.createIndex("uploadedAt", "uploadedAt", { unique: false })
        }

        if (!db.objectStoreNames.contains("logs")) {
          const logsStore = db.createObjectStore("logs", { keyPath: "id", autoIncrement: true })
          logsStore.createIndex("timestamp", "timestamp", { unique: false })
          logsStore.createIndex("userId", "userId", { unique: false })
        }

        if (!db.objectStoreNames.contains("completed")) {
          const completedStore = db.createObjectStore("completed", { keyPath: "applicationId" })
          completedStore.createIndex("userId", "userId", { unique: false })
          completedStore.createIndex("completedAt", "completedAt", { unique: false })
        }
      }
    })
  }

  // Check storage availability
  private async checkStorageAvailability(): Promise<{ available: boolean; error?: string; quota?: number }> {
    try {
      // Check if IndexedDB is supported
      if (!window.indexedDB) {
        return { available: false, error: "IndexedDB not supported" }
      }

      // Try to get storage estimate
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        const used = estimate.usage || 0
        const quota = estimate.quota || 0
        const available = quota - used

        console.log(
          `[DEBUG] Storage estimate: ${(used / 1024 / 1024).toFixed(1)}MB used, ${(quota / 1024 / 1024).toFixed(1)}MB total, ${(available / 1024 / 1024).toFixed(1)}MB available`,
        )

        if (available < 10 * 1024 * 1024) {
          // Less than 10MB available
          return {
            available: false,
            error: `Low storage space: only ${(available / 1024 / 1024).toFixed(1)}MB available`,
            quota: available,
          }
        }

        return { available: true, quota: available }
      }

      // Fallback: try to initialize DB
      await this.initDB()
      return { available: true }
    } catch (error) {
      return { available: false, error: `Storage check failed: ${error}` }
    }
  }

  // Silently save user application data
  async saveApplication(data: UserApplication): Promise<void> {
    try {
      // Check storage first
      const storageCheck = await this.checkStorageAvailability()
      if (!storageCheck.available) {
        throw new Error(storageCheck.error || "Storage not available")
      }

      const db = await this.initDB()

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
        lastUpdated: new Date().toISOString(),
      }

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["applications"], "readwrite")
        const store = transaction.objectStore("applications")
        const request = store.put(enhancedData)

        request.onsuccess = () => {
          this.logSilently("Application data collected", data.userId, data.currentStep)
          resolve()
        }

        request.onerror = () => {
          this.logSilently("Error in data collection", data.userId, 0, request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      this.logSilently("Error in data collection", data.userId, 0, error)
      throw error
    }
  }

  // Silent logging
  private async logSilently(message: string, userId: string, step: number, error?: any): Promise<void> {
    try {
      const db = await this.initDB()
      const logData = {
        timestamp: new Date().toISOString(),
        message,
        userId: userId.slice(-8), // Only log last 8 chars for privacy
        step,
        error: error?.message || null,
        userAgent: navigator.userAgent.substring(0, 100),
        url: window.location.href,
      }

      const transaction = db.transaction(["logs"], "readwrite")
      const store = transaction.objectStore("logs")
      store.add(logData)

      // Clean up old logs (keep only last 100)
      const countRequest = store.count()
      countRequest.onsuccess = () => {
        if (countRequest.result > 100) {
          const cursorRequest = store.openCursor()
          let deleteCount = countRequest.result - 100

          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result
            if (cursor && deleteCount > 0) {
              cursor.delete()
              deleteCount--
              cursor.continue()
            }
          }
        }
      }
    } catch (logError) {
      // Even logging can fail silently
      console.error("Silent logging failed:", logError)
    }
  }

  // Get all applications (admin only)
  async getAllApplications(): Promise<UserApplication[]> {
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["applications"], "readonly")
        const store = transaction.objectStore("applications")
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error("Failed to get applications:", error)
      return []
    }
  }

  // Get logs (admin only)
  async getLogs(): Promise<any[]> {
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["logs"], "readonly")
        const store = transaction.objectStore("logs")
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error("Failed to get logs:", error)
      return []
    }
  }

  // Get specific user application (admin only)
  async getUserApplication(userId: string): Promise<UserApplication | null> {
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["applications"], "readonly")
        const store = transaction.objectStore("applications")
        const request = store.get(userId)

        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error("Failed to get user application:", error)
      return null
    }
  }

  // Enhanced file saving with IndexedDB
  async saveFile(userId: string, fieldName: string, file: File): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Check storage availability first
        const storageCheck = await this.checkStorageAvailability()
        if (!storageCheck.available) {
          reject(new Error(storageCheck.error || "Storage not available"))
          return
        }

        // Check file size limits
        const maxFileSize = 100 * 1024 * 1024 // 100MB for IndexedDB
        if (file.size > maxFileSize) {
          reject(new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 100MB`))
          return
        }

        const reader = new FileReader()

        reader.onload = async () => {
          try {
            const base64 = reader.result as string
            const db = await this.initDB()

            const fileData = {
              id: `${userId}_${fieldName}_${Date.now()}`,
              userId: userId,
              fieldName: fieldName,
              name: file.name,
              type: file.type,
              size: file.size,
              data: base64,
              uploadedAt: new Date().toISOString(),
              deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
              },
            }

            const transaction = db.transaction(["files"], "readwrite")
            const store = transaction.objectStore("files")

            // Remove any existing file for this user/field combination
            const index = store.index("userId")
            const cursorRequest = index.openCursor(IDBKeyRange.only(userId))

            cursorRequest.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest).result
              if (cursor) {
                const existingFile = cursor.value
                if (existingFile.fieldName === fieldName) {
                  cursor.delete() // Remove old file
                }
                cursor.continue()
              }
            }

            // Add new file
            const addRequest = store.add(fileData)

            addRequest.onsuccess = () => {
              this.logSilently(`File collected: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`, userId, 0)
              resolve(base64)
            }

            addRequest.onerror = () => {
              this.logSilently("File processing error", userId, 0, addRequest.error)
              reject(new Error("Failed to save file"))
            }
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
  async getAllFiles(): Promise<any[]> {
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["files"], "readonly")
        const store = transaction.objectStore("files")
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error("Failed to get files:", error)
      return []
    }
  }

  // Get file for specific user and field
  async getFile(userId: string, fieldName: string): Promise<any | null> {
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["files"], "readonly")
        const store = transaction.objectStore("files")
        const index = store.index("userId")
        const request = index.openCursor(IDBKeyRange.only(userId))

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            const file = cursor.value
            if (file.fieldName === fieldName) {
              resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                data: file.data,
                uploadedAt: file.uploadedAt,
                fieldName: file.fieldName,
              })
              return
            }
            cursor.continue()
          } else {
            resolve(null)
          }
        }

        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      this.logSilently("File retrieval error", userId, 0, error)
      return null
    }
  }

  // Complete application silently
  async completeApplication(userId: string): Promise<string> {
    const application = await this.getUserApplication(userId)
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

    // Update main application
    await this.saveApplication(completedApplication)

    // Save to completed applications
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["completed"], "readwrite")
        const store = transaction.objectStore("completed")
        const request = store.put(completedApplication)

        request.onsuccess = () => {
          this.logSilently("Application completed", userId, 6)
          resolve(applicationId)
        }

        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      this.logSilently("Error completing application", userId, 6, error)
      throw error
    }
  }

  // Get completed applications (admin only)
  async getCompletedApplications(): Promise<UserApplication[]> {
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["completed"], "readonly")
        const store = transaction.objectStore("completed")
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error("Failed to get completed applications:", error)
      return []
    }
  }

  // Export all data (admin only)
  async exportAllData(): Promise<any> {
    const allApps = await this.getAllApplications()
    const completedApps = await this.getCompletedApplications()
    const allFiles = await this.getAllFiles()
    const logs = await this.getLogs()

    // Get storage estimate
    let storageInfo = { available: false, usage: 0, quota: 0 }
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        storageInfo = {
          available: true,
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        }
      }
    } catch (error) {
      console.error("Failed to get storage estimate:", error)
    }

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
        ...storageInfo,
        usageMB: (storageInfo.usage / 1024 / 1024).toFixed(1),
        quotaMB: (storageInfo.quota / 1024 / 1024).toFixed(1),
      },
    }
  }

  // Clear all data (admin only - for testing)
  async clearAllData(): Promise<void> {
    try {
      const db = await this.initDB()
      const storeNames = ["applications", "files", "logs", "completed"]

      for (const storeName of storeNames) {
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction([storeName], "readwrite")
          const store = transaction.objectStore(storeName)
          const request = store.clear()

          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      }

      this.logSilently("All data cleared", "admin", 0)
    } catch (error) {
      console.error("Failed to clear data:", error)
      throw error
    }
  }

  // Get storage usage statistics
  async getStorageStats(): Promise<any> {
    try {
      const allApps = await this.getAllApplications()
      const allFiles = await this.getAllFiles()
      const logs = await this.getLogs()

      let estimate = { usage: 0, quota: 0 }
      if (navigator.storage && navigator.storage.estimate) {
        estimate = await navigator.storage.estimate()
      }

      return {
        applications: allApps.length,
        files: allFiles.length,
        logs: logs.length,
        totalUsage: estimate.usage || 0,
        totalQuota: estimate.quota || 0,
        usageMB: ((estimate.usage || 0) / 1024 / 1024).toFixed(1),
        quotaMB: ((estimate.quota || 0) / 1024 / 1024).toFixed(1),
        percentUsed: estimate.quota ? (((estimate.usage || 0) / estimate.quota) * 100).toFixed(1) : "0",
      }
    } catch (error) {
      console.error("Failed to get storage stats:", error)
      return {
        applications: 0,
        files: 0,
        logs: 0,
        totalUsage: 0,
        totalQuota: 0,
        usageMB: "0",
        quotaMB: "0",
        percentUsed: "0",
      }
    }
  }
}

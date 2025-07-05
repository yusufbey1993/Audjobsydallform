import { type NextRequest, NextResponse } from "next/server"
import { writeFile, readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const userDir = join(process.cwd(), "user-data", userId)
    const formDataPath = join(userDir, "form-data.json")

    if (!existsSync(formDataPath)) {
      return NextResponse.json({ error: "No form data found for user" }, { status: 404 })
    }

    // Read existing form data
    const existingContent = await readFile(formDataPath, "utf-8")
    const formData = JSON.parse(existingContent)

    // Mark as completed
    const completedData = {
      ...formData,
      status: "completed",
      completedAt: new Date().toISOString(),
      applicationId: `APP-${userId}-${Date.now()}`,
    }

    // Save completed application
    await writeFile(formDataPath, JSON.stringify(completedData, null, 2))

    // Create a summary file for easy review
    const summaryPath = join(userDir, "application-summary.json")
    const summary = {
      applicationId: completedData.applicationId,
      userId,
      selectedJob: completedData.selectedJob,
      applicantName: `${completedData.formData.firstName} ${completedData.formData.lastName}`,
      email: completedData.formData.email,
      phone: completedData.formData.phone,
      completedAt: completedData.completedAt,
      status: "completed",
      documentsUploaded: {
        idFile1: completedData.formData.idFile1 || null,
        idFile2: completedData.formData.idFile2 || null,
        driverLicenseFront: completedData.formData.driverLicenseFront || null,
        driverLicenseBack: completedData.formData.driverLicenseBack || null,
      },
    }

    await writeFile(summaryPath, JSON.stringify(summary, null, 2))

    // Add to master applications list
    const masterListPath = join(process.cwd(), "applications-master-list.json")
    let masterList = []

    if (existsSync(masterListPath)) {
      try {
        const masterContent = await readFile(masterListPath, "utf-8")
        masterList = JSON.parse(masterContent)
      } catch (error) {
        console.log("Creating new master applications list")
      }
    }

    masterList.push(summary)
    await writeFile(masterListPath, JSON.stringify(masterList, null, 2))

    console.log(`Application completed for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: "Application completed successfully",
      applicationId: completedData.applicationId,
    })
  } catch (error) {
    console.error("Error completing application:", error)
    return NextResponse.json({ error: "Failed to complete application" }, { status: 500 })
  }
}

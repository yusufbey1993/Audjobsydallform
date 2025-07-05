import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir, readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json()
    const { userId } = formData

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Create user directory if it doesn't exist
    const userDir = join(process.cwd(), "user-data", userId)
    if (!existsSync(userDir)) {
      await mkdir(userDir, { recursive: true })
    }

    // Save form data to JSON file
    const formDataPath = join(userDir, "form-data.json")

    let existingData = {}
    if (existsSync(formDataPath)) {
      try {
        const existingContent = await readFile(formDataPath, "utf-8")
        existingData = JSON.parse(existingContent)
      } catch (error) {
        console.log("Creating new form data file for user:", userId)
      }
    }

    // Merge existing data with new data
    const updatedData = {
      ...existingData,
      ...formData,
      lastUpdated: new Date().toISOString(),
      history: [
        ...(existingData.history || []),
        {
          step: formData.currentStep,
          timestamp: new Date().toISOString(),
          data: formData.formData,
        },
      ],
    }

    await writeFile(formDataPath, JSON.stringify(updatedData, null, 2))

    // Also save a backup with timestamp
    const backupPath = join(userDir, `backup-${Date.now()}.json`)
    await writeFile(backupPath, JSON.stringify(updatedData, null, 2))

    console.log(`Form data saved for user ${userId} at step ${formData.currentStep}`)

    return NextResponse.json({
      success: true,
      message: "Form data saved successfully",
      userId,
      step: formData.currentStep,
    })
  } catch (error) {
    console.error("Error saving form data:", error)
    return NextResponse.json({ error: "Failed to save form data" }, { status: 500 })
  }
}

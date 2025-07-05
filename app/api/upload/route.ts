import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get("file") as unknown as File
    const userId: string = data.get("userId") as string
    const fieldName: string = data.get("fieldName") as string

    if (!file) {
      return NextResponse.json({ error: "No file received" }, { status: 400 })
    }

    if (!userId || !fieldName) {
      return NextResponse.json({ error: "Missing userId or fieldName" }, { status: 400 })
    }

    // Create user directory if it doesn't exist
    const userDir = join(process.cwd(), "uploads", userId)
    if (!existsSync(userDir)) {
      await mkdir(userDir, { recursive: true })
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop()
    const fileName = `${fieldName}_${timestamp}.${fileExtension}`
    const filePath = join(userDir, fileName)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Log file upload
    console.log(`File uploaded: ${fileName} for user ${userId}`)

    return NextResponse.json({
      success: true,
      fileName,
      filePath: `uploads/${userId}/${fileName}`,
      message: "File uploaded successfully",
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}

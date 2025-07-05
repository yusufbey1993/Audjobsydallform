"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Truck, Package, HardHat, Users, Clock, DollarSign } from "lucide-react"
import ApplicationForm from "@/components/application-form"

const jobCategories = [
  {
    id: "warehouse",
    title: "Warehouse Worker",
    icon: Package,
    description: "Pick, pack, and dispatch orders in modern warehouses",
    rate: "$25-30/hour",
    availability: "Immediate start",
    requirements: ["Physical fitness", "Reliable transport", "Safety boots"],
  },
  {
    id: "driver",
    title: "Delivery Driver",
    icon: Truck,
    description: "Deliver packages and goods across metropolitan areas",
    rate: "$28-35/hour",
    availability: "Immediate start",
    requirements: ["Valid driver license", "Clean driving record", "Own vehicle preferred"],
  },
  {
    id: "construction",
    title: "Construction Labourer",
    icon: HardHat,
    description: "General construction and building site work",
    rate: "$30-40/hour",
    availability: "Start Monday",
    requirements: ["White card", "Steel cap boots", "High vis clothing"],
  },
  {
    id: "hospitality",
    title: "Kitchen Hand",
    icon: Users,
    description: "Support kitchen operations in busy restaurants",
    rate: "$24-28/hour",
    availability: "Flexible shifts",
    requirements: ["Food safety knowledge", "Flexible hours", "Team player"],
  },
]

export default function HomePage() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [showApplication, setShowApplication] = useState(false)

  const handleApplyNow = (jobId: string) => {
    setSelectedJob(jobId)
    setShowApplication(true)
  }

  if (showApplication) {
    return <ApplicationForm selectedJob={selectedJob} onBack={() => setShowApplication(false)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Briefcase className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">QuickStart Jobs</h1>
                <p className="text-sm text-gray-600">Australia's Premier Job Agency</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              No Resume Required
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Apply Today, Start Tomorrow</h2>
          <p className="text-xl text-gray-600 mb-8">
            Quick application process with immediate job placement. No resume needed - just bring your ID and start
            earning!
          </p>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>5-minute application</span>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Competitive rates</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Immediate placement</span>
            </div>
          </div>
        </div>
      </section>

      {/* Job Categories */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Available Positions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {jobCategories.map((job) => {
              const IconComponent = job.icon
              return (
                <Card key={job.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription>{job.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-green-600">{job.rate}</span>
                      <Badge variant="outline">{job.availability}</Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Requirements:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {job.requirements.map((req, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => handleApplyNow(job.id)}>
                      Apply Now
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Why Choose QuickStart Jobs?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Clock className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold">Quick Process</h4>
              <p className="text-gray-600">
                Complete application in under 5 minutes. No lengthy interviews or waiting periods.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold">Competitive Pay</h4>
              <p className="text-gray-600">Above-award wages with weekly pay and potential for overtime and bonuses.</p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold">Ongoing Support</h4>
              <p className="text-gray-600">Dedicated support team to help you succeed in your new role.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Briefcase className="h-6 w-6" />
            <span className="text-lg font-semibold">QuickStart Jobs</span>
          </div>
          <p className="text-gray-400 mb-4">Licensed Australian Employment Agency | ABN: 12 345 678 901</p>
          <p className="text-sm text-gray-500">
            © 2024 QuickStart Jobs. All rights reserved. | Privacy Policy | Terms of Service
          </p>
        </div>
      </footer>
    </div>
  )
}

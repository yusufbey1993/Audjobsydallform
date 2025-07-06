"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Shield, Lock } from "lucide-react"
import AdminDashboard from "@/components/admin-dashboard"

export default function SecureAdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()

    if (password === "Username123") {
      setIsAuthenticated(true)
      setError("")
    } else {
      setError("Access denied. Invalid credentials.")
      setPassword("")
    }
  }

  if (isAuthenticated) {
    return <AdminDashboard />
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">Secure Admin Portal</CardTitle>
          <CardDescription>Authorized personnel only. Unauthorized access is prohibited.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center space-x-2">
                <Lock className="h-4 w-4" />
                <span>Access Code</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access code"
                className="bg-gray-50"
                required
              />
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
              Access System
            </Button>
          </form>

          <div className="mt-6 text-xs text-gray-500 text-center">
            This system monitors and logs all access attempts.
            <br />
            Unauthorized access will be reported to authorities.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

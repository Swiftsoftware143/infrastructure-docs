import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Zap, Shield, Accessibility } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await signIn(email, password)

      if (signInError) {
        setError(signInError.message || 'Invalid email or password')
        setLoading(false)
        return
      }

      if (!data?.user) {
        setError('Login failed. Please try again.')
        setLoading(false)
        return
      }

      // Successful login
      navigate('/')
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/20 mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            ADASwift
          </h1>
          <p className="text-gray-400 mt-2">AI-Powered ADA Compliance Platform</p>
        </div>

        <Card className="bg-[#1a1d29] border-[#2e3245] shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-white">Welcome Back</CardTitle>
            <CardDescription className="text-gray-400">
              Sign in to manage your accessibility widgets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-1 bg-[#0f1117] border-[#2e3245] text-white focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="mt-1 bg-[#0f1117] border-[#2e3245] text-white focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Features */}
            <div className="mt-6 pt-6 border-t border-[#2e3245]">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Shield className="w-4 h-4 text-red-500" />
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Accessibility className="w-4 h-4 text-red-500" />
                  <span>WCAG Compliant</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          © 2026 ADASwift by SwiftImpact Solutions. All rights reserved.
        </p>
      </div>
    </div>
  )
}

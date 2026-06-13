'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, Eye, EyeOff, Loader2 } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormValues) {
    setError('')
    const res = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })
    if (res?.error) {
      setError('Email atau password salah')
      return
    }
    router.push('/kasir')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f5f4f1] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-3">
            <img src="/logo-studiohub-white.png" alt="StudioHub" className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">StudioHub</h1>
          <p className="text-sm text-gray-500 mt-1">Sistem POS Photography Studio</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-lg font-bold mb-1">Masuk</h2>
          <p className="text-sm text-gray-500 mb-6">Login untuk melanjutkan</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="email@studio.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}

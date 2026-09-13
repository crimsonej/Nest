'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, Phone, Contact, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { createClient } from '@/lib/supabase/client'
import { studentRegistrationSchema } from '@/lib/validators'
import { defaultUniversity, getUniversityOptions, resolveUniversityRule } from '@/lib/university-config'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [facultyOptions, setFacultyOptions] = useState<Array<{ value: string; label: string; id: string }>>([])
  const [courseOptions, setCourseOptions] = useState<Array<{ value: string; label: string; facultyId: string }>>([])
  const universityOptions = getUniversityOptions()

  async function fetchAcademicOptions() {
    try {
      const [{ data: faculties }, { data: courses }] = await Promise.all([
        supabase.from('faculties').select('id, code, name').eq('is_active', true).order('name'),
        supabase.from('courses').select('id, code, name, faculty_id').eq('is_active', true).order('name'),
      ])
      setFacultyOptions(faculties?.map((faculty: { code: string; name: string; id: string }) => ({ value: faculty.code, label: `${faculty.code} - ${faculty.name}`, id: faculty.id })) || [])
      setCourseOptions(courses?.map((course: { code: string; name: string; faculty_id: string }) => ({ value: course.code, label: `${course.code} - ${course.name}`, facultyId: course.faculty_id })) || [])
    } catch (err) {
      console.error('Error fetching academic options:', err)
    }
  }

  useEffect(() => {
    fetchAcademicOptions()
  }, [supabase])

  const form = useForm({
    resolver: zodResolver(studentRegistrationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      gender: 'male',
      university: defaultUniversity.university,
      password: '',
      confirmPassword: '',
      studentRegistrationNumber: '',
      whatsappPhone: '',
      faculty: '',
      course: '',
    },
  })

  const selectedUniversity = form.watch('university') || defaultUniversity.university
  const selectedUniversityRule = resolveUniversityRule(selectedUniversity)
  const selectedFaculty = form.watch('faculty')
  const selectedFacultyId = facultyOptions.find((option) => option.value === selectedFaculty)?.id
  const visibleCourseOptions = courseOptions.filter((option) => {
    if (!selectedFacultyId) return true
    return option.facultyId === selectedFacultyId
  })

  async function onSubmit(values: any) {
    setLoading(true)
    setError('')
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            role: 'student',
            gender: values.gender,
            university: values.university,
          },
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .update({
            full_name: values.fullName,
            gender: values.gender,
            university: values.university,
            student_registration_number: values.studentRegistrationNumber,
            whatsapp_phone: values.whatsappPhone,
            faculty: values.faculty,
            course: values.course,
            role: 'student',
            status: 'normal',
          })
          .eq('id', data.user.id)

        if (profileError) throw profileError
      }

      setSuccess(true)
      setTimeout(() => router.push('/auth/login?registered=true'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Account Created!</h1>
        <p className="text-text-secondary">Your account has been created successfully. Redirecting to login...</p>
        <Button variant="outline" onClick={() => router.push('/auth/login')}>
          Go to Login
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-light text-danger text-sm" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Full Name"
          placeholder="John Doe"
          {...form.register('fullName')}
          icon={<User className="h-4 w-4" />}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@university.edu"
          {...form.register('email')}
          icon={<Mail className="h-4 w-4" />}
          autoComplete="email"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Gender *"
          error={form.formState.errors.gender?.message}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]}
          placeholder="Select your gender"
          value={form.watch('gender')}
          onChange={(value) => form.setValue('gender', value as 'male' | 'female' | 'other', { shouldValidate: true })}
        />
        <Select
          label="University *"
          error={form.formState.errors.university?.message}
          options={universityOptions}
          placeholder="Select your university"
          value={form.watch('university')}
          onChange={(value) => form.setValue('university', value, { shouldValidate: true })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Student Registration Number"
          placeholder={selectedUniversityRule.exampleRegNumber}
          helperText={`Accepted example: ${selectedUniversityRule.exampleRegNumber}`}
          error={form.formState.errors.studentRegistrationNumber?.message}
          {...form.register('studentRegistrationNumber')}
          icon={<Contact className="h-4 w-4" />}
          autoComplete="off"
        />
        <Input
          label="WhatsApp Phone Number"
          placeholder="+256 700 123 456"
          {...form.register('whatsappPhone')}
          icon={<Phone className="h-4 w-4" />}
          autoComplete="tel"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Faculty *"
          error={form.formState.errors.faculty?.message}
          options={facultyOptions}
          placeholder="Select your faculty"
          value={form.watch('faculty')}
          onChange={(value) => {
            form.setValue('faculty', value, { shouldValidate: true })
            form.setValue('course', '', { shouldValidate: true })
          }}
        />
        <Select
          label="Degree / Course *"
          error={form.formState.errors.course?.message}
          options={visibleCourseOptions}
          placeholder="Select your degree course"
          value={form.watch('course')}
          onChange={(value) => form.setValue('course', value, { shouldValidate: true })}
        />
      </div>

      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="At least 8 characters"
          {...form.register('password')}
          icon={<Lock className="h-4 w-4" />}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-[38px] text-text-muted hover:text-text-primary"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <Input
        label="Confirm Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="Confirm your password"
        {...form.register('confirmPassword')}
        icon={<Lock className="h-4 w-4" />}
        autoComplete="new-password"
      />

      <div className="space-y-2 text-sm text-text-secondary">
        <p className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
          By registering, you agree to our Terms of Service and Privacy Policy
        </p>
        <p className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
          Only university email addresses are accepted
        </p>
      </div>

      <Button type="submit" className="w-full" loading={loading}>
        Create Account
      </Button>

      <p className="text-center text-text-secondary">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary font-medium hover:underline">
          Sign In
        </Link>
      </p>
    </form>
  )
}
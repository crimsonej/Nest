'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  LogIn,
  UserPlus,
  SunMedium,
  MoonStar,
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  User,
  Phone,
  Contact,
  CheckCircle,
  BookOpen,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { studentRegistrationSchema } from '@/lib/validators'
import {
  defaultUniversity,
  getUniversityOptions,
  resolveUniversityRule,
} from '@/lib/university-config'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

/* ─────────────────────────────────────────────
   Animation Variants — defined once, reused throughout
───────────────────────────────────────────── */

// Stagger container: children animate in sequence
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
}

// Each form field slides up and fades in
const fieldVariant: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 420, damping: 32 },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.97,
    transition: { duration: 0.14, ease: 'easeIn' as const },
  },
}

// Entire panel slides in from direction
function getPanelVariants(direction: 'left' | 'right'): Variants {
  const xIn = direction === 'right' ? 40 : -40
  return {
    hidden: { opacity: 0, x: xIn, scale: 0.97, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 340,
        damping: 34,
        mass: 0.9,
        restDelta: 0.001,
      },
    },
    exit: {
      opacity: 0,
      x: direction === 'right' ? -40 : 40,
      scale: 0.97,
      filter: 'blur(6px)',
      transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as const },
    },
  }
}

/* ─────────────────────────────────────────────
   AuthStage — root
───────────────────────────────────────────── */

interface AuthStageProps {
  initialMode: 'login' | 'register'
}

export function AuthStage({ initialMode }: AuthStageProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [prevMode, setPrevMode] = useState<'login' | 'register'>(initialMode)
  const { resolvedTheme, setTheme } = useTheme()

  function handleModeChange(newMode: 'login' | 'register') {
    if (newMode === mode) return
    setPrevMode(mode)
    setMode(newMode)
    const targetUrl = newMode === 'login' ? '/auth/login' : '/auth/register'
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', targetUrl)
    }
  }

  function cycleTheme() {
    const order = ['light', 'mid', 'dark'] as const
    const current = (resolvedTheme as (typeof order)[number]) || 'light'
    setTheme(order[(order.indexOf(current) + 1) % order.length])
  }

  // Determine direction: login→register = right, register→login = left
  const slideDirection =
    prevMode === 'login' && mode === 'register' ? 'right' : 'left'

  return (
    <div className="w-full">
      {/* Tab Row */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-6 mb-8">
        {/* Segmented Pill Tabs */}
        <div
          className="relative inline-flex items-center rounded-2xl border border-border/80 bg-surface-hover/50 p-1 shadow-inner"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          {/* Shared sliding pill — always rendered, moves between tabs */}
          <motion.div
            layoutId="auth-tab-pill"
            className="absolute rounded-xl bg-primary shadow-lg"
            style={{
              left:
                mode === 'login'
                  ? '4px'
                  : 'calc(50% + 2px)',
              top: '4px',
              bottom: '4px',
              width: 'calc(50% - 6px)',
            }}
            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
          />

          {(['login', 'register'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleModeChange(tab)}
              className={`relative z-10 flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-colors duration-250 select-none min-w-[110px] justify-center ${
                mode === tab
                  ? 'text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {tab === 'login' ? (
                <LogIn className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <UserPlus className="h-3.5 w-3.5 shrink-0" />
              )}
              {tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.12, rotate: 18 }}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          type="button"
          onClick={cycleTheme}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-surface/80 text-text-secondary shadow-xs hover:text-text-primary"
          aria-label="Switch theme"
          title="Switch theme"
        >
          <AnimatePresence mode="wait" initial={false}>
            {resolvedTheme === 'dark' ? (
              <motion.span
                key="sun"
                initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <SunMedium className="h-4 w-4 text-amber-400" />
              </motion.span>
            ) : resolvedTheme === 'mid' ? (
              <motion.span
                key="sparkles"
                initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Sparkles className="h-4 w-4 text-rose-500" />
              </motion.span>
            ) : (
              <motion.span
                key="moon"
                initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MoonStar className="h-4 w-4 text-slate-500" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Animated Form Panel */}
      <div className="relative overflow-hidden" style={{ minHeight: '420px' }}>
        <AnimatePresence mode="wait" initial={false} custom={slideDirection}>
          {mode === 'login' ? (
            <motion.div
              key="login"
              variants={getPanelVariants('left')}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ willChange: 'transform, opacity, filter' }}
            >
              <LoginFormSection
                onSwitchToRegister={() => handleModeChange('register')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="register"
              variants={getPanelVariants('right')}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ willChange: 'transform, opacity, filter' }}
            >
              <RegisterFormSection
                onSwitchToLogin={() => handleModeChange('login')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Login Form
───────────────────────────────────────────── */

function LoginFormSection({
  onSwitchToRegister,
}: {
  onSwitchToRegister: () => void
}) {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (signInError) throw signInError

      const authUser = data.user
      if (!authUser)
        throw new Error(
          'Authentication succeeded but session could not be retrieved.'
        )

      const { data: profile } = await supabase
        .from('users')
        .select('role, status')
        .eq('id', authUser.id)
        .single()

      const isCoord =
        profile?.role === 'coordinator' ||
        profile?.status === 'coordinator' ||
        profile?.status === 'selected_coordinator'

      window.location.href = isCoord
        ? '/coordinator/dashboard'
        : '/student/dashboard'
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid credentials. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="space-y-5"
      >
        {/* Heading */}
        <motion.div variants={fieldVariant} className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Sign in to access your NEST workspace.
          </p>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="flex items-start gap-2.5 rounded-2xl border border-danger/25 bg-danger-light p-3.5 text-xs font-semibold text-danger"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fields */}
        <motion.div variants={fieldVariant}>
          <Input
            label="Email Address"
            type="email"
            placeholder="student@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="h-4 w-4" />}
            autoComplete="email"
            required
          />
        </motion.div>

        <motion.div variants={fieldVariant} className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="h-4 w-4" />}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-[38px] text-text-muted hover:text-text-primary transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <motion.span
              key={showPassword ? 'hide' : 'show'}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </motion.span>
          </button>
        </motion.div>

        <motion.div variants={fieldVariant}>
          <Button
            type="submit"
            size="lg"
            className="w-full shadow-lg"
            loading={loading}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </motion.div>

        <motion.div
          variants={fieldVariant}
          className="pt-4 border-t border-border/60 text-center text-xs text-text-secondary"
        >
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-bold text-primary hover:underline focus:outline-none"
          >
            Create one now
          </button>
        </motion.div>
      </motion.div>
    </form>
  )
}

/* ─────────────────────────────────────────────
   Register Form
───────────────────────────────────────────── */

function RegisterFormSection({
  onSwitchToLogin,
}: {
  onSwitchToLogin: () => void
}) {
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [facultyOptions, setFacultyOptions] = useState<
    Array<{ value: string; label: string; id: string }>
  >([])
  const [courseOptions, setCourseOptions] = useState<
    Array<{ id: string; value: string; label: string; facultyId: string }>
  >([])
  const [courseUnitOptions, setCourseUnitOptions] = useState<
    Array<{ id: string; value: string; label: string; courseId: string }>
  >([])
  const [selectedCourseUnitIds, setSelectedCourseUnitIds] = useState<string[]>(
    []
  )
  const [courseUnitDialogOpen, setCourseUnitDialogOpen] = useState(false)
  const [courseUnitsLoading, setCourseUnitsLoading] = useState(false)
  const [courseUnitError, setCourseUnitError] = useState('')
  const [pendingAuthUserId, setPendingAuthUserId] = useState('')
  const [savingCourseUnits, setSavingCourseUnits] = useState(false)
  const universityOptions = getUniversityOptions()

  async function fetchAcademicOptions() {
    try {
      const [{ data: faculties }, { data: courses }] = await Promise.all([
        supabase
          .from('faculties')
          .select('id, code, name')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('courses')
          .select('id, code, name, faculty_id')
          .eq('is_active', true)
          .order('name'),
      ])
      setFacultyOptions(
        faculties?.map((f: { code: string; name: string; id: string }) => ({
          value: f.code,
          label: `${f.code} - ${f.name}`,
          id: f.id,
        })) || []
      )
      setCourseOptions(
        courses?.map(
          (c: {
            id: string
            code: string
            name: string
            faculty_id: string
          }) => ({
            id: c.id,
            value: c.code,
            label: `${c.code} - ${c.name}`,
            facultyId: c.faculty_id,
          })
        ) || []
      )
    } catch (err) {
      console.error('Error fetching academic options:', err)
    }
  }

  async function fetchCourseUnits(courseId: string) {
    setCourseUnitsLoading(true)
    setCourseUnitError('')
    try {
      const { data, error } = await supabase
        .from('course_units')
        .select('id, code, name, course_id')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('code')

      if (error) throw error
      setCourseUnitOptions(
        data?.map(
          (unit: {
            id: string
            code: string
            name: string
            course_id: string
          }) => ({
            id: unit.id,
            value: unit.id,
            label: `${unit.code} - ${unit.name}`,
            courseId: unit.course_id,
          })
        ) || []
      )
    } catch (err) {
      setCourseUnitError(
        err instanceof Error ? err.message : 'Unable to load course units.'
      )
    } finally {
      setCourseUnitsLoading(false)
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

  const selectedUniversity =
    form.watch('university') || defaultUniversity.university
  const selectedUniversityRule = resolveUniversityRule(selectedUniversity)
  const selectedFaculty = form.watch('faculty')
  const selectedFacultyId = facultyOptions.find(
    (option) => option.value === selectedFaculty
  )?.id
  const selectedCourseName = form.watch('course')
  const selectedCourseId =
    courseOptions.find((option) => option.value === selectedCourseName)?.id ||
    ''
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
      const authUser = data.user
      if (!authUser)
        throw new Error('Account registration did not return a valid user.')

      const { error: profileError } = await supabase.from('users').upsert(
        {
          id: authUser.id,
          email: values.email,
          full_name: values.fullName,
          gender: values.gender,
          university: values.university,
          student_registration_number: values.studentRegistrationNumber,
          whatsapp_phone: values.whatsappPhone,
          faculty: values.faculty,
          course: values.course,
          role: 'student',
          status: 'normal',
        },
        { onConflict: 'id' }
      )

      if (profileError) throw profileError

      setPendingAuthUserId(authUser.id)
      setSelectedCourseUnitIds([])
      setCourseUnitDialogOpen(true)
      await fetchCourseUnits(selectedCourseId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  function finishRegistration() {
    setCourseUnitDialogOpen(false)
    setSuccess(true)
    setTimeout(() => onSwitchToLogin(), 1600)
  }

  async function saveCourseUnits() {
    if (!pendingAuthUserId || selectedCourseUnitIds.length === 0) {
      finishRegistration()
      return
    }

    setSavingCourseUnits(true)
    setCourseUnitError('')
    try {
      const enrollments = selectedCourseUnitIds.map((courseUnitId) => ({
        user_id: pendingAuthUserId,
        course_unit_id: courseUnitId,
        status: 'active',
      }))
      const { error: enrollmentError } = await supabase
        .from('student_course_units')
        .upsert(enrollments, { onConflict: 'user_id,course_unit_id' })
      if (enrollmentError) throw enrollmentError
      finishRegistration()
    } catch (err) {
      setCourseUnitError(
        err instanceof Error ? err.message : 'Unable to save course units.'
      )
    } finally {
      setSavingCourseUnits(false)
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="space-y-5 text-center py-10"
      >
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.1 }}
          className="h-20 w-20 rounded-3xl bg-success-light text-success flex items-center justify-center mx-auto shadow-lg"
        >
          <CheckCircle className="h-10 w-10" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <h1 className="text-2xl font-black text-text-primary">
            Account Created!
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            Redirecting to sign in…
          </p>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="space-y-4"
      >
        {/* Heading */}
        <motion.div variants={fieldVariant} className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Create your account
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Register with your university details to get started.
          </p>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="flex items-start gap-2.5 rounded-2xl border border-danger/25 bg-danger-light p-3.5 text-xs font-semibold text-danger"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Row: Full Name + Email */}
        <motion.div
          variants={fieldVariant}
          className="grid gap-3.5 md:grid-cols-2"
        >
          <Input
            label="Full Name *"
            placeholder="John Doe"
            error={form.formState.errors.fullName?.message}
            {...form.register('fullName')}
            icon={<User className="h-4 w-4" />}
          />
          <Input
            label="Email *"
            type="email"
            placeholder="you@university.edu"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
            icon={<Mail className="h-4 w-4" />}
            autoComplete="email"
          />
        </motion.div>

        {/* Row: Gender + University */}
        <motion.div
          variants={fieldVariant}
          className="grid gap-3.5 md:grid-cols-2"
        >
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
            onChange={(value) =>
              form.setValue('gender', value as 'male' | 'female' | 'other', {
                shouldValidate: true,
              })
            }
          />
          <Select
            label="University *"
            error={form.formState.errors.university?.message}
            options={universityOptions}
            placeholder="Select your university"
            value={form.watch('university')}
            onChange={(value) =>
              form.setValue('university', value, { shouldValidate: true })
            }
          />
        </motion.div>

        {/* Row: Reg Number + WhatsApp */}
        <motion.div
          variants={fieldVariant}
          className="grid gap-3.5 md:grid-cols-2"
        >
          <Input
            label="Registration Number *"
            placeholder={selectedUniversityRule.exampleRegNumber}
            helperText={`Example: ${selectedUniversityRule.exampleRegNumber}`}
            error={form.formState.errors.studentRegistrationNumber?.message}
            {...form.register('studentRegistrationNumber')}
            icon={<Contact className="h-4 w-4" />}
            autoComplete="off"
          />
          <Input
            label="WhatsApp Number *"
            placeholder="+256 700 123 456"
            error={form.formState.errors.whatsappPhone?.message}
            {...form.register('whatsappPhone')}
            icon={<Phone className="h-4 w-4" />}
            autoComplete="tel"
          />
        </motion.div>

        {/* Row: Faculty + Course */}
        <motion.div
          variants={fieldVariant}
          className="grid gap-3.5 md:grid-cols-2"
        >
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
            placeholder="Select your course"
            value={form.watch('course')}
            onChange={(value) => {
              form.setValue('course', value, { shouldValidate: true })
              setSelectedCourseUnitIds([])
            }}
          />
        </motion.div>

        {/* Row: Password + Confirm */}
        <motion.div
          variants={fieldVariant}
          className="grid gap-3.5 md:grid-cols-2"
        >
          <div className="relative">
            <Input
              label="Password *"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              error={form.formState.errors.password?.message}
              {...form.register('password')}
              icon={<Lock className="h-4 w-4" />}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-[38px] text-text-muted hover:text-text-primary transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <motion.span
                key={showPassword ? 'hide' : 'show'}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </motion.span>
            </button>
          </div>
          <Input
            label="Confirm Password *"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            error={form.formState.errors.confirmPassword?.message}
            {...form.register('confirmPassword')}
            icon={<Lock className="h-4 w-4" />}
            autoComplete="new-password"
          />
        </motion.div>

        {/* Submit */}
        <motion.div variants={fieldVariant}>
          <Button
            type="submit"
            size="lg"
            className="w-full shadow-lg"
            loading={loading}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create Account
          </Button>
        </motion.div>

        <motion.p
          variants={fieldVariant}
          className="text-center text-xs text-text-secondary pt-3 border-t border-border/60"
        >
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-bold text-primary hover:underline focus:outline-none"
          >
            Sign In
          </button>
        </motion.p>
      </motion.div>

      <Modal
        isOpen={courseUnitDialogOpen}
        onClose={finishRegistration}
        title="Choose your course units"
        description="This step is optional. You can skip it now and add course units from your student dashboard later."
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary-light/40 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-text-primary text-sm">
                Personalize your workspace
              </p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Select the units you are taking this semester so relevant
                coursework appears in your dashboard.
              </p>
            </div>
          </div>

          {courseUnitsLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-text-secondary font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading active course units...
            </div>
          ) : courseUnitError ? (
            <div
              className="rounded-2xl border border-danger/25 bg-danger-light p-4 text-xs font-semibold text-danger"
              role="alert"
            >
              {courseUnitError}
            </div>
          ) : courseUnitOptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-text-secondary">
              No active course units are available for this course yet. You can
              add them later from your student dashboard.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
              {courseUnitOptions.map((unit) => {
                const checked = selectedCourseUnitIds.includes(unit.id)
                return (
                  <label
                    key={unit.id}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/80 bg-surface p-3.5 transition-all hover:border-primary/40 hover:bg-primary-light/20"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedCourseUnitIds((prev) =>
                          checked
                            ? prev.filter((id) => id !== unit.id)
                            : [...prev, unit.id]
                        )
                      }
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <span>
                      <span className="block font-bold text-text-primary text-xs">
                        {unit.label}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        Link this unit to your profile
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={finishRegistration}
              disabled={savingCourseUnits}
            >
              Skip for now
            </Button>
            <Button
              onClick={saveCourseUnits}
              loading={savingCourseUnits}
              disabled={
                courseUnitsLoading ||
                Boolean(courseUnitError) ||
                courseUnitOptions.length === 0
              }
            >
              Save selected units
            </Button>
          </div>
        </div>
      </Modal>
    </form>
  )
}

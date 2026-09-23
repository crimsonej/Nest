'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Determine icon based on input format
  const getIdentifierIcon = () => {
    const val = identifier.trim()
    if (val.includes('/')) return <Contact className="h-4 w-4 text-primary" />
    if (/^[+\d\s\-()]+$/.test(val) && val.length >= 4) return <Phone className="h-4 w-4 text-primary" />
    return <Mail className="h-4 w-4 text-primary" />
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!identifier || !password) {
      setError('Please enter your email, phone, or reg number and password.')
      return
    }

    setLoading(true)
    setError('')

    try {
      let targetEmail = identifier.trim()

      // Resolve non-email identifiers via server endpoint
      if (!targetEmail.includes('@')) {
        const res = await fetch('/api/auth/resolve-identifier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: targetEmail }),
        })
        const resData = await res.json()
        if (!res.ok || resData.error) {
          throw new Error(resData.error || 'Account not found with provided identifier.')
        }
        targetEmail = resData.email
      }

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: targetEmail,
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
        .maybeSingle()

      let userRole = profile?.role || authUser.app_metadata?.role
      const userStatus = profile?.status

      if (userRole !== 'lecturer') {
        const { data: lecturerProfile } = await supabase
          .from('lecturers')
          .select('id')
          .eq('id', authUser.id)
          .maybeSingle()

        if (lecturerProfile) {
          userRole = 'lecturer'
        }
      }

      const isLecturer = userRole === 'lecturer'
      const isCoord =
        !isLecturer &&
        (userRole === 'coordinator' ||
          userStatus === 'coordinator' ||
          userStatus === 'selected_coordinator')

      if (isLecturer) {
        let needsPasswordChange = false
        try {
          const { data: lecturerProfile } = await supabase
            .from('lecturers')
            .select('must_change_password')
            .eq('id', authUser.id)
            .maybeSingle()

          if (lecturerProfile) {
            needsPasswordChange = lecturerProfile.must_change_password === true
          }
        } catch (err) {
          console.warn('Error checking lecturer must_change_password:', err)
        }

        window.location.href = needsPasswordChange
          ? '/lecturer/change-password'
          : '/lecturer/reports'
        return
      }

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
        {/* Heading & Badge */}
        <motion.div variants={fieldVariant} className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-light/50 px-3 py-1 text-[11px] font-bold text-primary backdrop-blur-md shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-spin" style={{ animationDuration: '8s' }} />
            <span>Multi-Identifier Sign In Enabled</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Sign in using your Email, Phone Number, or Registration Number.
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
              className="flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-light p-3.5 text-xs font-semibold text-danger shadow-sm"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fields */}
        <motion.div variants={fieldVariant} className="space-y-1">
          <Input
            label="Email, Phone, or Reg Number"
            type="text"
            placeholder="student@nest.edu, +256700..., or 26/2/222/D/2222"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            icon={getIdentifierIcon()}
            autoComplete="username"
            required
          />
        </motion.div>

        <motion.div variants={fieldVariant} className="relative space-y-1">
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
            className="absolute right-3.5 top-[38px] text-text-muted hover:text-text-primary transition-colors p-1"
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
          <div className="flex justify-end pt-1">
            <Link
              href="/auth/forgot-password"
              className="text-xs font-bold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Forgot password?
            </Link>
          </div>
        </motion.div>

        <motion.div variants={fieldVariant} className="pt-1">
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              size="lg"
              className="w-full shadow-xl font-bold tracking-wide transition-all duration-300"
              loading={loading}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In to Workspace
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          variants={fieldVariant}
          className="pt-4 border-t border-border/60 text-center text-xs text-text-secondary"
        >
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-extrabold text-primary hover:underline focus:outline-none"
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
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [pendingRegistration, setPendingRegistration] = useState<any>(null)
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [savingCourseUnits, setSavingCourseUnits] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const universityOptions = getUniversityOptions()

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  async function fetchAcademicOptions() {
    try {
      const [facultiesResult, coursesResult] = await Promise.all([
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

      if (facultiesResult.error) throw facultiesResult.error
      if (coursesResult.error) throw coursesResult.error

      setFacultyOptions(
        facultiesResult.data?.map((f: { code: string; name: string; id: string }) => ({
          value: f.code,
          label: `${f.code} - ${f.name}`,
          id: f.id,
        })) || []
      )
      setCourseOptions(
        coursesResult.data?.map(
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
      setError(err instanceof Error ? err.message : 'Unable to load faculties and courses.')
    }
  }

  async function fetchCourseUnits(courseId: string, facultyId?: string) {
    setCourseUnitsLoading(true)
    setCourseUnitError('')
    try {
      const [unitsResult, sharedResult] = await Promise.all([
        supabase
          .from('course_units')
          .select('id, code, name, course_id, course:courses(faculty_id)')
          .eq('is_active', true)
          .order('code'),
        facultyId
          ? supabase.from('course_unit_faculties').select('course_unit_id').eq('faculty_id', facultyId)
          : Promise.resolve({ data: [] as any[] }),
      ])

      if (unitsResult.error) throw unitsResult.error

      const sharedUnitIds = new Set((sharedResult.data || []).map((s: any) => s.course_unit_id))

      const displayUnits = (unitsResult.data || []).filter((unit: any) => {
        if (courseId && unit.course_id === courseId) return true
        if (sharedUnitIds.has(unit.id)) return true
        if (!courseId && facultyId && unit.course?.faculty_id === facultyId) return true
        return !courseId && !facultyId
      })

      setCourseUnitOptions(
        displayUnits.map(
          (unit: any) => ({
            id: unit.id,
            value: unit.id,
            label: `${unit.code} - ${unit.name}`,
            courseId: unit.course_id || courseId,
          })
        )
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
  }, [])

  const form = useForm({
    resolver: zodResolver(studentRegistrationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      gender: '',
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

  async function finishProfileRegistration(authUser: { id: string }, values: any, courseId: string) {
    const formattedGender = (values.gender || 'other').toLowerCase()
    const { error: profileError } = await supabase.from('users').upsert(
      {
        id: authUser.id,
        email: values.email?.toLowerCase().trim(),
        full_name: values.fullName?.trim(),
        gender: formattedGender,
        university: values.university?.trim(),
        student_registration_number: values.studentRegistrationNumber?.trim(),
        whatsapp_phone: values.whatsappPhone?.trim(),
        faculty: values.faculty?.trim(),
        course: values.course?.trim(),
        faculty_id: values.facultyId || selectedFacultyId || null,
        course_id: courseId || null,
        role: 'student',
        status: 'normal',
        flagged_for_review: values.flaggedForReview || false,
        flag_reason: values.flagReason || null,
      },
      { onConflict: 'id' }
    )
    if (profileError) throw profileError

    setPendingAuthUserId(authUser.id)
    setSelectedCourseUnitIds([])
    setCourseUnitDialogOpen(true)
    await fetchCourseUnits(courseId, values.facultyId || selectedFacultyId)
  }

  async function onSubmit(values: any) {
    setLoading(true)
    setError('')
    try {
      // 1. Perform server-side normalization & duplicate check
      const checkRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          facultyId: selectedFacultyId,
          courseId: selectedCourseId,
        }),
      })

      const checkData = await checkRes.json()

      if (!checkRes.ok || checkData.error || checkData.duplicate) {
        throw new Error(
          checkData.error ||
            'An account may already exist for these details. Try signing in or resetting your password.'
        )
      }

      const normalized = checkData.normalized || values
      const flaggedForReview = checkData.flaggedForReview || false
      const flagReason = checkData.flagReason || null

      const emailRedirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/api/auth/callback`
          : 'https://nest-df6.pages.dev/api/auth/callback'

      // 2. Trigger Supabase Email Auth SignUp
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalized.email,
        password: values.password,
        options: {
          emailRedirectTo,
          data: {
            full_name: normalized.fullName,
            role: 'student',
            gender: normalized.gender,
            university: normalized.university,
            student_registration_number: normalized.studentRegistrationNumber,
            whatsapp_phone: normalized.whatsappPhone,
            faculty: normalized.faculty,
            course: normalized.course,
            faculty_id: selectedFacultyId || null,
            course_id: selectedCourseId || null,
            flagged_for_review: flaggedForReview,
            flag_reason: flagReason,
          },
        },
      })

      if (signUpError) throw signUpError
      const authUser = data.user
      if (!authUser)
        throw new Error('Account registration did not return a valid user.')

      const regPayload = {
        ...normalized,
        facultyId: selectedFacultyId,
        courseId: selectedCourseId,
        flaggedForReview,
        flagReason,
      }

      if (data.session) {
        await finishProfileRegistration(authUser, regPayload, selectedCourseId)
      } else {
        setPendingAuthUserId(authUser.id)
        setPendingRegistration(regPayload)
        setVerificationEmail(normalized.email)
        setVerificationCode('')
      }
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Registration failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function verifyRegistrationCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setVerificationLoading(true)
    setError('')
    try {
      // Primary: verify with type 'email'
      let verifyResult = await supabase.auth.verifyOtp({
        email: verificationEmail,
        token: verificationCode.trim(),
        type: 'email',
      })

      // Fallback: verify with type 'signup' if type 'email' fails
      if (verifyResult.error) {
        verifyResult = await supabase.auth.verifyOtp({
          email: verificationEmail,
          token: verificationCode.trim(),
          type: 'signup',
        })
      }

      if (verifyResult.error) throw verifyResult.error
      const authUser = verifyResult.data.user
      if (!authUser || !pendingRegistration) {
        throw new Error('Verification succeeded but the account profile is unavailable.')
      }

      setVerificationEmail('')
      setVerificationCode('')
      setPendingRegistration(null)
      await finishProfileRegistration(authUser, pendingRegistration, pendingRegistration.courseId)
    } catch (err) {
      setError(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Invalid verification code. Please check your email and try again.'
      )
    } finally {
      setVerificationLoading(false)
    }
  }

  async function resendRegistrationCode() {
    if (resendCooldown > 0) return

    setVerificationLoading(true)
    setError('')
    try {
      const emailRedirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/api/auth/callback`
          : 'https://nest-df6.pages.dev/api/auth/callback'

      let resendResult = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
        options: {
          emailRedirectTo,
        },
      })
      if (resendResult.error) {
        resendResult = await supabase.auth.resend({
          type: 'email_change',
          email: verificationEmail,
          options: {
            emailRedirectTo,
          },
        })
      }
      if (resendResult.error) throw resendResult.error
      setResendCooldown(60)
    } catch (err) {
      setError(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Unable to resend the verification code.'
      )
    } finally {
      setVerificationLoading(false)
    }
  }

  function finishRegistration() {
    setCourseUnitDialogOpen(false)
    setSuccess(true)
    setTimeout(() => {
      window.location.href = '/student/dashboard'
    }, 1400)
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

  if (verificationEmail) {
    return (
      <form onSubmit={verifyRegistrationCode} className="space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-light/50 px-3 py-1 text-[11px] font-bold text-primary backdrop-blur-md">
            <Mail className="h-3.5 w-3.5 text-primary" />
            <span>Email Security Confirmation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary">Check your email</h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            We sent a confirmation email to <strong className="text-text-primary">{verificationEmail}</strong>. You can either click the confirmation link or enter the six-digit code.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-light p-3.5 text-xs font-semibold text-danger" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="6-Digit Email Verification Code *"
          placeholder="123456"
          value={verificationCode}
          onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          icon={<Lock className="h-4 w-4" />}
          required
        />

        <Button
          type="submit"
          size="lg"
          className="w-full font-bold shadow-lg"
          loading={verificationLoading}
          disabled={verificationLoading || verificationCode.length < 6}
        >
          Verify Email & Continue
        </Button>

        <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs">
          <button
            type="button"
            onClick={resendRegistrationCode}
            disabled={verificationLoading || resendCooldown > 0}
            className="font-bold text-primary hover:underline disabled:opacity-50"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend confirmation email'}
          </button>

          <button
            type="button"
            onClick={() => {
              setVerificationEmail('')
              setPendingRegistration(null)
              setError('')
            }}
            className="text-text-muted hover:text-text-primary transition-colors font-medium"
          >
            Change email
          </button>
        </div>
      </form>
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
          className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4"
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
          className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4"
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
          className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4"
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
          className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4"
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
          className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4"
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

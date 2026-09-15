import { z } from 'zod'
import { resolveUniversityRule } from '@/lib/university-config'

export const studentRegistrationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  gender: z.enum(['male', 'female', 'other'], { errorMap: () => ({ message: 'Gender is required' }) }),
  university: z.string().min(2, 'University is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  studentRegistrationNumber: z
    .string()
    .trim()
    .min(6, 'Registration number must be at least 6 characters')
    .max(25, 'Registration number must be at most 25 characters'),
  whatsappPhone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be at most 15 digits')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format'),
  faculty: z.string().min(2, 'Faculty is required'),
  course: z.string().min(2, 'Course is required'),
}).superRefine((data, ctx) => {
  const selectedUniversity = resolveUniversityRule(data.university)
  const pattern = new RegExp(selectedUniversity.acceptedRegNumberPattern, 'i')

  if (!pattern.test(data.studentRegistrationNumber.trim())) {
    ctx.addIssue({
      code: 'custom',
      path: ['studentRegistrationNumber'],
      message: `Registration number must match ${selectedUniversity.university} format, for example ${selectedUniversity.exampleRegNumber}`,
    })
  }
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const localIdString = z.string().min(1, 'Required value is missing')

export const courseworkSchema = z.object({
  courseUnitId: localIdString,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional().or(z.literal('')),
  type: z.enum(['assignment', 'coursework', 'presentation', 'project', 'lab']).default('assignment'),
  workStyle: z.enum(['group_work', 'personal']).default('group_work'),
  submissionMode: z.enum(['email', 'handwritten_copy', 'typed_printed']).default('email'),
  maxGroupSize: z.number().int().min(1, 'Minimum group size is 1').max(20),
  minGroupSize: z.number().int().min(1, 'Minimum group size is 1').max(10),
  allowSelfFormation: z.boolean().default(true),
  lockAt: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.workStyle === 'personal') {
    if (data.minGroupSize !== 1 || data.maxGroupSize !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxGroupSize'],
        message: 'Personal coursework uses one-person submissions',
      })
    }
    return
  }

  if (data.minGroupSize > data.maxGroupSize) {
    ctx.addIssue({
      code: 'custom',
      path: ['minGroupSize'],
      message: 'Minimum group size cannot exceed maximum group size',
    })
  }
})

export const groupCreationSchema = z.object({
  courseworkId: localIdString,
  name: z.string().min(3, 'Group name must be at least 3 characters').max(100),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
  maxMembers: z.number().int().min(2).max(20).default(5),
})

export const groupJoinRequestSchema = z.object({
  groupId: localIdString,
})

export const taskSchema = z.object({
  groupId: localIdString.optional().nullable(),
  courseworkId: localIdString,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'submitted', 'graded']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional().nullable(),
})

export const resourceSchema = z.object({
  groupId: localIdString,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional(),
  fileUrl: z.string().url('Invalid file URL'),
  fileType: z.string(),
  fileSize: z.number().int().positive(),
})

export const csvImportSchema = z.object({
  courseworkId: localIdString,
  csvData: z.string().min(1, 'CSV data is required'),
})

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>
export type CourseworkInput = z.infer<typeof courseworkSchema>
export type GroupCreationInput = z.infer<typeof groupCreationSchema>
export type GroupJoinRequestInput = z.infer<typeof groupJoinRequestSchema>
export type TaskInput = z.infer<typeof taskSchema>
export type ResourceInput = z.infer<typeof resourceSchema>
export type CSVImportInput = z.infer<typeof csvImportSchema>
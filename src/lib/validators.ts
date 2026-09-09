import { z } from 'zod'

export const studentRegistrationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  studentRegistrationNumber: z
    .string()
    .min(6, 'Registration number must be at least 6 characters')
    .max(15, 'Registration number must be at most 15 characters')
    .regex(/^[A-Z0-9]+$/i, 'Registration number can only contain letters and numbers'),
  whatsappPhone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be at most 15 digits')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format'),
  course: z.string().min(2, 'Course is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const courseworkSchema = z.object({
  courseUnitId: z.string().uuid('Invalid course unit'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional(),
  type: z.enum(['assignment', 'project', 'presentation', 'lab']),
  maxGroupSize: z.number().int().min(2, 'Minimum group size is 2').max(20),
  minGroupSize: z.number().int().min(1, 'Minimum group size is 1').max(10),
  allowSelfFormation: z.boolean().default(true),
  lockAt: z.string().datetime().optional().nullable(),
}).refine((data) => data.minGroupSize <= data.maxGroupSize, {
  message: 'Minimum group size cannot exceed maximum group size',
  path: ['minGroupSize'],
})

export const groupCreationSchema = z.object({
  courseworkId: z.string().uuid('Invalid coursework'),
  name: z.string().min(3, 'Group name must be at least 3 characters').max(100),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
  maxMembers: z.number().int().min(2).max(20).default(5),
})

export const groupJoinRequestSchema = z.object({
  groupId: z.string().uuid('Invalid group'),
})

export const taskSchema = z.object({
  groupId: z.string().uuid().optional().nullable(),
  courseworkId: z.string().uuid('Invalid coursework'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'submitted', 'graded']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional().nullable(),
})

export const resourceSchema = z.object({
  groupId: z.string().uuid('Invalid group'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional(),
  fileUrl: z.string().url('Invalid file URL'),
  fileType: z.string(),
  fileSize: z.number().int().positive(),
})

export const csvImportSchema = z.object({
  courseworkId: z.string().uuid('Invalid coursework'),
  csvData: z.string().min(1, 'CSV data is required'),
})

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>
export type CourseworkInput = z.infer<typeof courseworkSchema>
export type GroupCreationInput = z.infer<typeof groupCreationSchema>
export type GroupJoinRequestInput = z.infer<typeof groupJoinRequestSchema>
export type TaskInput = z.infer<typeof taskSchema>
export type ResourceInput = z.infer<typeof resourceSchema>
export type CSVImportInput = z.infer<typeof csvImportSchema>
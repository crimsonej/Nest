export type ThemeMode = 'light' | 'mid' | 'dark'

export interface UniversityRule {
  university: string
  abbreviation: string
  branch: string
  location: string
  acceptedRegNumberPattern: string
  exampleRegNumber: string
  supportedIntakeYears?: number[]
  programs?: string[]
}

export const universityRules: UniversityRule[] = [
  {
    university: 'Ndejje University',
    abbreviation: 'NDU',
    branch: 'Kampala Campus',
    location: 'Kampala, Uganda',
    acceptedRegNumberPattern: '^\\d{2}/[12]/\\d{3}/D/\\d{4}$',
    exampleRegNumber: '26/2/222/D/2222',
    supportedIntakeYears: [1, 2, 3, 4, 5],
    programs: ['Computer Science', 'Information Technology', 'Software Engineering', 'Statistics', 'Business', 'Education'],
  },
]

export const defaultUniversity = universityRules[0]

export function getUniversityOptions() {
  return universityRules.map((item) => ({
    value: item.university,
    label: `${item.university} (${item.branch})`,
  }))
}

export function resolveUniversityRule(universityName = defaultUniversity.university) {
  return universityRules.find((item) => item.university.toLowerCase() === universityName.toLowerCase()) || defaultUniversity
}

export function validateRegistrationNumber(regNumber: string, universityName = defaultUniversity.university) {
  const university = resolveUniversityRule(universityName)
  const regex = new RegExp(university.acceptedRegNumberPattern, 'i')
  return {
    valid: regex.test(regNumber.trim()),
    pattern: university.acceptedRegNumberPattern,
    example: university.exampleRegNumber,
    university,
  }
}

export function getThemeOptions() {
  return [
    { value: 'light', label: 'Light' },
    { value: 'mid', label: 'Mid' },
    { value: 'dark', label: 'Dark' },
  ] as const
}

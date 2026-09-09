# Student Registration Page

## Form Fields

1. **Full Name** - Text input, required, min 2 characters
2. **Email** - Email input, required, must be university email
3. **Password** - Password input, required, min 8 characters
4. **Confirm Password** - Password input, required, must match
5. **Student Registration Number** - Text input, required, alphanumeric 6-15 chars
6. **WhatsApp Phone Number** - Tel input, required, 10-15 digits with formatting
7. **Course** - Text input, required

## Validation Rules

- Email must be valid format
- Password minimum 8 characters
- Registration number: alphanumeric only, 6-15 characters
- Phone: digits, spaces, dashes, parentheses, plus sign allowed
- Passwords must match

## Flow

1. User fills form and submits
2. Create Supabase Auth user with email/password
3. Store metadata: full_name, role='student'
4. Create profile in users table with additional fields
5. Redirect to login with success message
6. Email verification sent (if enabled)

## API Integration

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name,
      role: 'student',
    },
  },
})

if (data.user) {
  await supabase.from('users').update({
    full_name,
    student_registration_number,
    whatsapp_phone,
    course,
    role: 'student',
  }).eq('id', data.user.id)
}
```

## Error Handling

- Duplicate email: "An account with this email already exists"
- Weak password: "Password must be at least 8 characters"
- Invalid email format: "Please enter a valid email address"
- Network errors: "Registration failed. Please try again."
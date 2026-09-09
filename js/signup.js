document.addEventListener('DOMContentLoaded', () => {
  initSupabase();

  const form = document.getElementById('signup-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    const full_name = document.getElementById('full_name').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const reg_number = document.getElementById('reg_number').value.trim().toUpperCase();
    const whatsapp = document.getElementById('whatsapp').value.trim();
    const course = document.getElementById('course').value;

    // Basic client-side validation
    if (!/^[A-Z0-9\/\-]+$/i.test(reg_number)) {
      showAlert('alert', 'Registration number contains invalid characters.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
      return;
    }
    if (!/^\+?[\d\s\-]{9,15}$/.test(whatsapp.replace(/\s/g, ''))) {
      showAlert('alert', 'Please enter a valid WhatsApp number with country code.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
      return;
    }

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            role: 'student'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Sign up failed. Please try again.');

      // 2. Insert profile (trigger may also handle this; this is explicit)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        email,
        full_name,
        role: 'student',
        reg_number,
        whatsapp,
        course
      });

      if (profileError) {
        // Profile might already exist from trigger
        console.warn('Profile upsert:', profileError.message);
      }

      showAlert('alert', 'Account created! Check your email to confirm, then sign in.', 'success');
      form.reset();

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2500);

    } catch (err) {
      console.error(err);
      let msg = err.message || 'Something went wrong. Please try again.';
      if (msg.includes('already registered')) {
        msg = 'This email is already registered. Please sign in instead.';
      }
      showAlert('alert', msg, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  initSupabase();

  const form = document.getElementById('signup-form');
  const submitBtn = document.getElementById('submit-btn');

  if (!form) return;

  if (!supabase) {
    showAlert('alert', 'This is a demo registration form. Connect Supabase in js/config.js to save student records to the database.', 'error');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Demo Mode';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    const full_name = document.getElementById('full_name').value.trim();
    const gender = document.getElementById('gender').value;
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const university = document.getElementById('university').value;
    const faculty = document.getElementById('faculty').value.trim();
    const reg_number = document.getElementById('reg_number').value.trim().toUpperCase();
    const year_of_study = document.getElementById('year_of_study').value;
    const whatsapp = document.getElementById('whatsapp').value.trim();
    const course = document.getElementById('course').value;

    if (!full_name || !email || !password || !reg_number || !whatsapp || !course) {
      showAlert('alert', 'Please complete all required fields before continuing.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
      return;
    }

    if (university === 'Ndejje University - Kampala Campus' && !/^\d{2}\/\d{1,2}\/\d{3,4}\/[A-Z]\/\d{4}$/i.test(reg_number)) {
      showAlert('alert', 'Use the Ndejje format 26/2/222/D/2222.', 'error');
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            gender,
            university,
            faculty,
            role: 'student'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Sign up failed. Please try again.');

      const { error: profileError } = await supabase.from('users').upsert({
        id: authData.user.id,
        email,
        full_name,
        gender,
        university,
        faculty,
        role: 'student',
        student_registration_number: reg_number,
        intake_year: year_of_study ? Number(year_of_study) : null,
        whatsapp_phone: whatsapp,
        course
      });

      if (profileError) {
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

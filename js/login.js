document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('login-form')) return;

  initSupabase();

  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');

  if (!supabase) {
    showAlert('alert', 'Demo mode is active. Connect Supabase in js/config.js to enable live authentication and database access.', 'error');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Demo Mode';
    return;
  }

  try {
    const existing = await getCurrentUser();
    if (existing) {
      window.location.href = existing.role === 'coordinator' ? 'coordinator.html' : 'student.html';
      return;
    }
  } catch (error) {
    console.warn('Could not resolve current user:', error);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const role = profile?.role || 'student';
      window.location.href = role === 'coordinator' ? 'coordinator.html' : 'student.html';

    } catch (err) {
      console.error(err);
      showAlert('alert', err.message || 'Invalid email or password.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
});

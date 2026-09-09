document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();

  // If already logged in, redirect
  const existing = await getCurrentUser();
  if (existing) {
    window.location.href = existing.role === 'coordinator' ? 'coordinator.html' : 'student.html';
    return;
  }

  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');

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
        .from('profiles')
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

/**
 * UniGroup – Supabase Configuration
 * Replace the placeholders below with your actual Supabase project credentials.
 * Get them from: Supabase Dashboard → Project Settings → API
 */
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client (loaded via CDN in HTML pages)
let supabase = null;

function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase JS library not loaded. Include the CDN script.');
    return null;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

// Role helpers
const ROLES = {
  STUDENT: 'student',
  COORDINATOR: 'coordinator'
};

/**
 * Get current session user + profile
 */
async function getCurrentUser() {
  if (!supabase) initSupabase();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return {
    id: session.user.id,
    email: session.user.email,
    ...profile
  };
}

/**
 * Require authentication; redirect if not logged in
 */
async function requireAuth(allowedRoles = null) {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    window.location.href = user.role === 'coordinator' ? 'coordinator.html' : 'student.html';
    return null;
  }
  return user;
}

/**
 * Sign out
 */
async function signOut() {
  if (!supabase) initSupabase();
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

/**
 * Format date nicely
 */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

/**
 * Show toast / alert inside a container
 */
function showAlert(containerId, message, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.classList.remove('hidden');
}

/**
 * Simple modal helpers
 */
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

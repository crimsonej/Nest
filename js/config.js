/**
 * NEST – Supabase Configuration
 * The anon key is safe for browser use; database access remains protected by RLS.
 */
window.NEST_APP = {
  appName: 'NEST',
  university: 'Ndejje University',
  regNumberExample: '26/2/222/D/2222',
  defaultTheme: 'light',
  supports: ['light', 'mid', 'dark'],
  demoMode: false,
  backend: 'Supabase'
};

const SUPABASE_URL = 'https://mdnocngeawlqqthfthtk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1jAtR72jyMK4s2HudOsx0A_cQCDHRry';

// Initialize Supabase client (loaded via CDN in HTML pages)
let supabase = null;

function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase JS library not loaded. Include the CDN script.');
    return null;
  }

  if (SUPABASE_URL.includes('YOUR_PROJECT_REF') || SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')) {
    console.warn('NEST is running in demo mode. Configure Supabase in js/config.js to connect to the database.');
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
  if (!supabase) return null;

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;

  const { data: profile } = await supabase
    .from('users')
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
  if (supabase) {
    await supabase.auth.signOut();
  }
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

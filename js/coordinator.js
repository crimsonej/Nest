let currentUser = null;
let courseUnits = [];
let allGroups = [];
let allStudents = [];

document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  currentUser = await requireAuth(['coordinator']);
  if (!currentUser) return;

  document.getElementById('user-name').textContent = currentUser.full_name || 'Coordinator';
  document.getElementById('user-avatar').textContent = (currentUser.full_name || 'C')[0].toUpperCase();

  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      switchView(view);
      document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');
    });
  });

  await loadCourseUnits();
  await loadOverview();
  setupForms();
});

function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${view}`)?.classList.remove('hidden');

  const titles = {
    overview: 'Overview',
    groups: 'Live Group Monitor',
    assignments: 'Assignments',
    students: 'Student Roster',
    interventions: 'Interventions',
    exports: 'Export & Reports'
  };
  document.getElementById('page-title').textContent = titles[view] || 'Overview';

  if (view === 'groups') loadGroupsTable();
  if (view === 'assignments') loadAssignmentsTable();
  if (view === 'students') loadStudentsTable();
  if (view === 'interventions') loadInterventions();
}

async function loadCourseUnits() {
  const { data } = await supabase.from('course_units').select('*').order('code');
  courseUnits = data || [];

  ['groups-course-filter', 'pa-course', 'students-course-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const first = el.options[0]?.cloneNode(true);
    el.innerHTML = '';
    if (first && first.value === '') el.appendChild(first);
    else if (id !== 'pa-course') {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'All Course Units';
      el.appendChild(opt);
    }
    courseUnits.forEach(cu => {
      const opt = document.createElement('option');
      opt.value = cu.id;
      opt.textContent = `${cu.code} – ${cu.name}`;
      el.appendChild(opt);
    });
  });
}

async function loadOverview() {
  // Metrics
  const { count: courseCount } = await supabase.from('course_units').select('*', { count: 'exact', head: true });
  const { count: studentCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
  const { count: groupCount } = await supabase.from('groups').select('*', { count: 'exact', head: true });
  const { count: assignCount } = await supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('is_locked', false);

  document.getElementById('stat-courses').textContent = courseCount || 0;
  document.getElementById('stat-students').textContent = studentCount || 0;
  document.getElementById('stat-groups').textContent = groupCount || 0;
  document.getElementById('stat-assignments').textContent = assignCount || 0;

  // Recent groups
  const { data: groups } = await supabase
    .from('groups')
    .select('*, course_units(code), group_members(count)')
    .order('created_at', { ascending: false })
    .limit(10);

  const tbody = document.getElementById('overview-groups-tbody');
  if (!groups?.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">No groups formed yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = groups.map(g => {
    const count = g.group_members?.[0]?.count ?? 0;
    return `
      <tr>
        <td>${g.course_units?.code || '—'}</td>
        <td><strong>${escapeHtml(g.name)}</strong></td>
        <td>${escapeHtml(g.leader_name || '—')}</td>
        <td>${count}/${g.max_members || 5}</td>
        <td>${formatDate(g.created_at)}</td>
        <td><span class="badge ${g.is_locked ? 'badge-danger' : 'badge-success'}">${g.is_locked ? 'Locked' : 'Open'}</span></td>
      </tr>`;
  }).join('');
}

async function loadGroupsTable() {
  const search = document.getElementById('groups-search')?.value?.toLowerCase() || '';
  const courseFilter = document.getElementById('groups-course-filter')?.value || '';

  let query = supabase
    .from('groups')
    .select('*, course_units(code, name), group_members(count)')
    .order('created_at', { ascending: false });

  if (courseFilter) query = query.eq('course_unit_id', courseFilter);

  const { data } = await query;
  allGroups = data || [];

  let filtered = allGroups;
  if (search) {
    filtered = filtered.filter(g =>
      g.name.toLowerCase().includes(search) ||
      (g.leader_name || '').toLowerCase().includes(search)
    );
  }

  const tbody = document.getElementById('groups-tbody');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No groups found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(g => {
    const count = g.group_members?.[0]?.count ?? 0;
    return `
      <tr>
        <td>${g.course_units?.code || '—'}</td>
        <td><strong>${escapeHtml(g.name)}</strong></td>
        <td>${escapeHtml(g.leader_name || '—')}</td>
        <td>${count}/${g.max_members || 5}</td>
        <td><span class="badge badge-neutral">${g.visibility || 'public'}</span></td>
        <td><span class="badge ${g.is_locked ? 'badge-danger' : 'badge-success'}">${g.is_locked ? 'Locked' : 'Open'}</span></td>
        <td class="flex gap-1">
          ${!g.is_locked
            ? `<button class="btn btn-outline btn-sm" onclick="toggleLock('${g.id}', true)">Lock</button>`
            : `<button class="btn btn-outline btn-sm" onclick="toggleLock('${g.id}', false)">Unlock</button>`}
          <button class="btn btn-ghost btn-sm" onclick="viewMembers('${g.id}')">Members</button>
        </td>
      </tr>`;
  }).join('');
}

document.getElementById('groups-search')?.addEventListener('input', debounce(loadGroupsTable, 300));
document.getElementById('groups-course-filter')?.addEventListener('change', loadGroupsTable);

async function toggleLock(groupId, lock) {
  await supabase.from('groups').update({ is_locked: lock }).eq('id', groupId);
  loadGroupsTable();
  loadOverview();
}

async function lockAllOpen() {
  if (!confirm('Lock group formation for all currently open groups?')) return;
  await supabase.from('groups').update({ is_locked: true }).eq('is_locked', false);
  loadGroupsTable();
  loadOverview();
}

async function viewMembers(groupId) {
  const { data } = await supabase
    .from('group_members')
    .select('*, profiles(full_name, reg_number, email)')
    .eq('group_id', groupId);

  const list = (data || []).map(m =>
    `• ${m.profiles?.full_name || 'Unknown'} (${m.profiles?.reg_number || '—'}) – ${m.role}`
  ).join('\n') || 'No members';
  alert(`Group members:\n\n${list}`);
}

async function loadAssignmentsTable() {
  const { data } = await supabase
    .from('assignments')
    .select('*, course_units(code), groups(count)')
    .order('deadline', { ascending: true });

  const tbody = document.getElementById('assignments-tbody');
  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No assignments published.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(a => {
    const groupCount = a.groups?.[0]?.count ?? 0;
    return `
      <tr>
        <td>${a.course_units?.code || '—'}</td>
        <td><strong>${escapeHtml(a.title)}</strong></td>
        <td>${a.min_size}–${a.max_size}</td>
        <td>${formatDate(a.deadline)}</td>
        <td>${groupCount}</td>
        <td><span class="badge ${a.is_locked ? 'badge-danger' : 'badge-success'}">${a.is_locked ? 'Locked' : 'Open'}</span></td>
        <td>
          ${!a.is_locked
            ? `<button class="btn btn-outline btn-sm" onclick="lockAssignment('${a.id}')">Lock</button>`
            : '—'}
        </td>
      </tr>`;
  }).join('');
}

async function lockAssignment(id) {
  await supabase.from('assignments').update({ is_locked: true }).eq('id', id);
  // Also lock related groups
  await supabase.from('groups').update({ is_locked: true }).eq('assignment_id', id);
  loadAssignmentsTable();
}

function openPublishAssignmentModal() {
  openModal('modal-publish-assignment');
}

function setupForms() {
  document.getElementById('form-publish-assignment')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const course_unit_id = document.getElementById('pa-course').value;
    const title = document.getElementById('pa-title').value.trim();
    const description = document.getElementById('pa-desc').value.trim();
    const min_size = parseInt(document.getElementById('pa-min').value, 10);
    const max_size = parseInt(document.getElementById('pa-max').value, 10);
    const deadline = document.getElementById('pa-deadline').value;

    const { error } = await supabase.from('assignments').insert({
      course_unit_id,
      title,
      description,
      min_size,
      max_size,
      deadline: new Date(deadline).toISOString(),
      created_by: currentUser.id,
      is_locked: false
    });

    if (error) {
      alert(error.message);
      return;
    }
    closeModal('modal-publish-assignment');
    document.getElementById('form-publish-assignment').reset();
    loadAssignmentsTable();
    loadOverview();
  });

  document.getElementById('form-override')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const group_id = document.getElementById('override-group').value;
    const user_id = document.getElementById('override-student').value;

    // Check capacity
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group_id);

    const { data: group } = await supabase.from('groups').select('max_members').eq('id', group_id).single();
    if (count >= (group?.max_members || 5)) {
      alert('Group is already at maximum capacity.');
      return;
    }

    const { error } = await supabase.from('group_members').insert({
      group_id,
      user_id,
      role: 'member'
    });

    if (error) {
      alert(error.message.includes('duplicate') ? 'Student is already in this group.' : error.message);
      return;
    }
    alert('Student added successfully.');
    loadInterventions();
  });
}

async function loadStudentsTable() {
  const search = document.getElementById('students-search')?.value?.toLowerCase() || '';
  const courseFilter = document.getElementById('students-course-filter')?.value || '';

  let query = supabase
    .from('users')
    .select('*, group_members(count)')
    .eq('role', 'student')
    .order('full_name');

  if (courseFilter) {
    // Filter by course name string match if course units not linked directly
    // For simplicity we filter client-side on course field
  }

  const { data } = await query;
  allStudents = data || [];

  let filtered = allStudents;
  if (search) {
    filtered = filtered.filter(s =>
      (s.full_name || '').toLowerCase().includes(search) ||
      (s.reg_number || '').toLowerCase().includes(search) ||
      (s.email || '').toLowerCase().includes(search)
    );
  }
  if (courseFilter) {
    const cu = courseUnits.find(c => c.id === courseFilter);
    if (cu) {
      filtered = filtered.filter(s => (s.course || '').includes(cu.name) || (s.course || '').includes(cu.code));
    }
  }

  const tbody = document.getElementById('students-tbody');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">No students found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td>${escapeHtml(s.full_name || '—')}</td>
      <td>${escapeHtml(s.reg_number || '—')}</td>
      <td>${escapeHtml(s.email || '—')}</td>
      <td>${escapeHtml(s.whatsapp || '—')}</td>
      <td>${escapeHtml(s.course || '—')}</td>
      <td>${s.group_members?.[0]?.count ?? 0}</td>
    </tr>
  `).join('');
}

document.getElementById('students-search')?.addEventListener('input', debounce(loadStudentsTable, 300));
document.getElementById('students-course-filter')?.addEventListener('change', loadStudentsTable);

async function loadInterventions() {
  // Students not in any group
  const { data: students } = await supabase
    .from('users')
    .select('id, full_name, reg_number, course, group_members(group_id)')
    .eq('role', 'student');

  const orphans = (students || []).filter(s => !s.group_members?.length);
  document.getElementById('stat-orphans').textContent = orphans.length;

  const tbody = document.getElementById('orphans-tbody');
  if (!orphans.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-muted)">All students are assigned to at least one group.</td></tr>`;
  } else {
    tbody.innerHTML = orphans.map(s => `
      <tr>
        <td>${escapeHtml(s.full_name)}</td>
        <td>${escapeHtml(s.reg_number || '—')}</td>
        <td>${escapeHtml(s.course || '—')}</td>
        <td><button class="btn btn-outline btn-sm" onclick="quickAddToGroup('${s.id}')">Add to group…</button></td>
      </tr>
    `).join('');
  }

  // Populate override selects
  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, course_units(code)')
    .eq('is_locked', false);

  const gSel = document.getElementById('override-group');
  gSel.innerHTML = '<option value="">Select group</option>';
  (groups || []).forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = `${g.course_units?.code || ''} – ${g.name}`;
    gSel.appendChild(opt);
  });

  const sSel = document.getElementById('override-student');
  sSel.innerHTML = '<option value="">Select student</option>';
  (students || []).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.full_name} (${s.reg_number || '—'})`;
    sSel.appendChild(opt);
  });
}

async function forceRemove() {
  const group_id = document.getElementById('override-group').value;
  const user_id = document.getElementById('override-student').value;
  if (!group_id || !user_id) {
    alert('Select both group and student.');
    return;
  }
  if (!confirm('Remove this student from the group?')) return;

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', group_id)
    .eq('user_id', user_id);

  if (error) {
    alert(error.message);
    return;
  }
  alert('Student removed.');
  loadInterventions();
}

async function autoFillRandom() {
  if (!confirm('Randomly assign unassigned students into groups that still have capacity?')) return;

  // Simplified: fetch open groups with capacity and orphans, then assign
  const { data: groups } = await supabase
    .from('groups')
    .select('id, max_members, group_members(count)')
    .eq('is_locked', false);

  const { data: students } = await supabase
    .from('users')
    .select('id, group_members(group_id)')
    .eq('role', 'student');

  const orphans = (students || []).filter(s => !s.group_members?.length);
  const openGroups = (groups || [])
    .map(g => ({
      id: g.id,
      remaining: (g.max_members || 5) - (g.group_members?.[0]?.count || 0)
    }))
    .filter(g => g.remaining > 0);

  if (!openGroups.length || !orphans.length) {
    alert('No capacity or no unassigned students.');
    return;
  }

  // Shuffle orphans
  for (let i = orphans.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orphans[i], orphans[j]] = [orphans[j], orphans[i]];
  }

  let assigned = 0;
  let gi = 0;
  for (const student of orphans) {
    // Find next group with remaining capacity
    while (gi < openGroups.length && openGroups[gi].remaining <= 0) gi++;
    if (gi >= openGroups.length) break;

    const { error } = await supabase.from('group_members').insert({
      group_id: openGroups[gi].id,
      user_id: student.id,
      role: 'member'
    });
    if (!error) {
      openGroups[gi].remaining--;
      assigned++;
    }
  }

  alert(`Assigned ${assigned} student(s).`);
  loadInterventions();
  loadOverview();
}

function quickAddToGroup(studentId) {
  document.getElementById('override-student').value = studentId;
  switchView('interventions');
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  document.querySelector('[data-view="interventions"]').classList.add('active');
  alert('Select a group and click Force Add.');
}

async function exportCSV() {
  const { data } = await supabase
    .from('groups')
    .select('*, course_units(code, name), group_members(*, profiles(full_name, reg_number))');

  let csv = 'Course Code,Group Name,Leader,Members,Max,Visibility,Locked,Member List\n';
  (data || []).forEach(g => {
    const members = (g.group_members || [])
      .map(m => `${m.profiles?.full_name || ''} (${m.profiles?.reg_number || ''})`)
      .join('; ');
    csv += `"${g.course_units?.code || ''}","${g.name}","${g.leader_name || ''}",${g.group_members?.length || 0},${g.max_members || 5},"${g.visibility}",${g.is_locked},"${members}"\n`;
  });

  downloadBlob(csv, 'unigroup-groups.csv', 'text/csv');
}

async function exportStudentsCSV() {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'student');

  let csv = 'Full Name,Reg Number,Email,WhatsApp,Course\n';
  (data || []).forEach(s => {
    csv += `"${s.full_name || ''}","${s.reg_number || ''}","${s.email || ''}","${s.whatsapp || ''}","${s.course || ''}"\n`;
  });
  downloadBlob(csv, 'unigroup-students.csv', 'text/csv');
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function triggerSheetsSync() {
  const status = document.getElementById('export-status');
  status.innerHTML = '<p class="text-sm">Syncing…</p>';
  try {
    const { data, error } = await supabase.functions.invoke('sync-to-sheets', {
      body: { event: 'full_sync' }
    });
    if (error) throw error;
    status.innerHTML = '<p class="text-sm" style="color:var(--success)">Sync completed successfully.</p>';
  } catch (err) {
    status.innerHTML = `<p class="text-sm" style="color:var(--danger)">Sync failed or not configured: ${err.message}</p>`;
  }
}

function refreshAll() {
  loadOverview();
  const active = document.querySelector('.sidebar-nav a.active')?.dataset.view;
  if (active && active !== 'overview') switchView(active);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

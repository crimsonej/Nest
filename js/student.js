let currentUser = null;
let courseUnits = [];
let myMemberships = [];

document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  currentUser = await requireAuth(['student']);
  if (!currentUser) return;

  // Populate user UI
  document.getElementById('user-name').textContent = currentUser.full_name || 'Student';
  document.getElementById('user-avatar').textContent = (currentUser.full_name || 'S')[0].toUpperCase();

  // Navigation
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
  await loadDashboard();
  setupForms();
});

function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${view}`)?.classList.remove('hidden');

  const titles = {
    dashboard: 'Dashboard',
    groups: 'My Groups',
    browse: 'Browse Groups',
    tasks: 'Task Board',
    assignments: 'Assignments'
  };
  document.getElementById('page-title').textContent = titles[view] || 'Dashboard';

  if (view === 'groups') loadMyGroups();
  if (view === 'browse') loadBrowseGroups();
  if (view === 'tasks') loadTasks();
  if (view === 'assignments') loadAssignments();
}

async function loadCourseUnits() {
  const { data, error } = await supabase
    .from('course_units')
    .select('*')
    .order('code');
  if (error) {
    console.error(error);
    return;
  }
  courseUnits = data || [];

  // Populate selects
  const selects = ['cg-course', 'browse-course-filter'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    // Keep first option
    const first = el.options[0];
    el.innerHTML = '';
    el.appendChild(first);
    courseUnits.forEach(cu => {
      const opt = document.createElement('option');
      opt.value = cu.id;
      opt.textContent = `${cu.code} – ${cu.name}`;
      el.appendChild(opt);
    });
  });
}

async function loadDashboard() {
  // My memberships
  const { data: memberships } = await supabase
    .from('group_members')
    .select('*, groups(*, course_units(code, name))')
    .eq('user_id', currentUser.id);

  myMemberships = memberships || [];
  document.getElementById('stat-my-groups').textContent = myMemberships.length;

  // Open assignments count
  const { count: assignCount } = await supabase
    .from('assignments')
    .select('*', { count: 'exact', head: true })
    .eq('is_locked', false);
  document.getElementById('stat-assignments').textContent = assignCount || 0;

  // Tasks in progress
  const groupIds = myMemberships.map(m => m.group_id);
  if (groupIds.length) {
    const { count: taskCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('group_id', groupIds)
      .eq('status', 'in_progress');
    document.getElementById('stat-tasks').textContent = taskCount || 0;
  }

  // Recent groups preview
  const container = document.getElementById('dashboard-groups');
  if (!myMemberships.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">👥</div>
        <h3>No groups yet</h3>
        <p>Create or join a group for your course units.</p>
        <button class="btn btn-primary" onclick="openCreateGroupModal()">Create Group</button>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="groups-grid">${myMemberships.slice(0, 4).map(m => renderGroupCard(m.groups, m.role)).join('')}</div>`;
}

function renderGroupCard(group, role = 'member') {
  if (!group) return '';
  const course = group.course_units
    ? `${group.course_units.code}`
    : '—';
  const memberCount = group.member_count ?? '—';
  const max = group.max_members || 5;
  const isFull = memberCount >= max;
  const visibility = group.visibility || 'public';

  return `
    <div class="group-card">
      <div class="group-card-header">
        <h3>${escapeHtml(group.name)}</h3>
        <span class="badge ${visibility === 'public' ? 'badge-info' : 'badge-neutral'}">${visibility}</span>
      </div>
      <div class="group-meta">
        ${course} · ${memberCount}/${max} members · Leader: ${escapeHtml(group.leader_name || '—')}
        ${role === 'leader' ? ' · <strong>You are leader</strong>' : ''}
      </div>
      <p class="text-sm text-muted mb-2">${escapeHtml(group.description || '')}</p>
      <div class="group-actions">
        ${role ? `<button class="btn btn-outline btn-sm" onclick="viewGroup('${group.id}')">Open</button>` : ''}
        ${!role && !isFull && visibility === 'public' ? `<button class="btn btn-primary btn-sm" onclick="joinGroup('${group.id}')">Join</button>` : ''}
        ${!role && visibility === 'private' ? `<button class="btn btn-outline btn-sm" onclick="requestJoin('${group.id}')">Request to join</button>` : ''}
      </div>
    </div>`;
}

async function loadMyGroups() {
  const { data: memberships } = await supabase
    .from('group_members')
    .select('*, groups(*, course_units(code, name))')
    .eq('user_id', currentUser.id);

  const container = document.getElementById('my-groups-list');
  if (!memberships?.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="icon">👥</div>
        <h3>You haven't joined any groups</h3>
        <p>Browse available groups or create your own.</p>
        <button class="btn btn-primary" onclick="openCreateGroupModal()">Create Group</button>
      </div>`;
    return;
  }

  // Enrich with member counts
  const cards = await Promise.all(memberships.map(async (m) => {
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', m.group_id);
    m.groups.member_count = count;
    return renderGroupCard(m.groups, m.role);
  }));

  container.innerHTML = cards.join('');
}

async function loadBrowseGroups() {
  const search = document.getElementById('browse-search')?.value?.toLowerCase() || '';
  const courseFilter = document.getElementById('browse-course-filter')?.value || '';

  let query = supabase
    .from('groups')
    .select('*, course_units(code, name), group_members(count)')
    .eq('is_locked', false)
    .order('created_at', { ascending: false });

  if (courseFilter) query = query.eq('course_unit_id', courseFilter);

  const { data, error } = await query;
  if (error) {
    console.error(error);
    return;
  }

  // Get my memberships to mark already joined
  const { data: myMems } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', currentUser.id);
  const myGroupIds = new Set((myMems || []).map(m => m.group_id));

  let groups = data || [];
  if (search) {
    groups = groups.filter(g =>
      g.name.toLowerCase().includes(search) ||
      (g.description || '').toLowerCase().includes(search)
    );
  }

  const container = document.getElementById('browse-groups-list');
  if (!groups.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="icon">🔍</div>
        <h3>No groups found</h3>
        <p>Try a different filter or create a new group.</p>
      </div>`;
    return;
  }

  container.innerHTML = groups.map(g => {
    const count = g.group_members?.[0]?.count ?? 0;
    g.member_count = count;
    const alreadyJoined = myGroupIds.has(g.id);
    return renderGroupCard(g, alreadyJoined ? 'member' : null);
  }).join('');
}

// Search & filter listeners
document.getElementById('browse-search')?.addEventListener('input', debounce(loadBrowseGroups, 300));
document.getElementById('browse-course-filter')?.addEventListener('change', loadBrowseGroups);

async function loadAssignments() {
  const { data } = await supabase
    .from('assignments')
    .select('*, course_units(code, name)')
    .order('deadline', { ascending: true });

  const tbody = document.getElementById('assignments-tbody');
  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">No assignments published yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(a => {
    const locked = a.is_locked;
    const deadline = formatDate(a.deadline);
    return `
      <tr>
        <td>${a.course_units?.code || '—'}</td>
        <td><strong>${escapeHtml(a.title)}</strong></td>
        <td>${a.min_size || 2}–${a.max_size || 6}</td>
        <td>${deadline}</td>
        <td><span class="badge ${locked ? 'badge-danger' : 'badge-success'}">${locked ? 'Locked' : 'Open'}</span></td>
        <td>
          ${!locked ? `<button class="btn btn-primary btn-sm" onclick="createGroupForAssignment('${a.id}', '${a.course_unit_id}')">Form Group</button>` : '—'}
        </td>
      </tr>`;
  }).join('');
}

async function loadTasks() {
  const groupIds = myMemberships.map(m => m.group_id);
  if (!groupIds.length) {
    ['todo', 'in_progress', 'submitted'].forEach(s => {
      document.getElementById(`tasks-${s}`).innerHTML = '<p class="text-sm text-muted">Join a group first.</p>';
      document.getElementById(`count-${s}`).textContent = '0';
    });
    return;
  }

  // Populate group filter
  const filter = document.getElementById('task-group-filter');
  const first = filter.options[0];
  filter.innerHTML = '';
  filter.appendChild(first);
  myMemberships.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.group_id;
    opt.textContent = m.groups?.name || m.group_id;
    filter.appendChild(opt);
  });

  // Also for add-task modal
  const taskGroupSelect = document.getElementById('task-group');
  taskGroupSelect.innerHTML = '';
  myMemberships.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.group_id;
    opt.textContent = m.groups?.name || m.group_id;
    taskGroupSelect.appendChild(opt);
  });

  let query = supabase
    .from('tasks')
    .select('*')
    .in('group_id', groupIds)
    .order('created_at', { ascending: false });

  const groupFilter = filter.value;
  if (groupFilter) query = query.eq('group_id', groupFilter);

  const { data: tasks } = await query;

  const byStatus = { todo: [], in_progress: [], submitted: [] };
  (tasks || []).forEach(t => {
    if (byStatus[t.status]) byStatus[t.status].push(t);
  });

  Object.keys(byStatus).forEach(status => {
    const list = document.getElementById(`tasks-${status}`);
    const count = document.getElementById(`count-${status}`);
    count.textContent = byStatus[status].length;
    list.innerHTML = byStatus[status].map(t => `
      <div class="task-item" data-id="${t.id}">
        <h4>${escapeHtml(t.title)}</h4>
        <p>${escapeHtml(t.description || '')}</p>
        <div class="flex gap-1 mt-1">
          ${status !== 'todo' ? `<button class="btn btn-ghost btn-sm" onclick="moveTask('${t.id}','todo')">← To-Do</button>` : ''}
          ${status !== 'in_progress' ? `<button class="btn btn-ghost btn-sm" onclick="moveTask('${t.id}','in_progress')">In Progress</button>` : ''}
          ${status !== 'submitted' ? `<button class="btn btn-ghost btn-sm" onclick="moveTask('${t.id}','submitted')">Submitted →</button>` : ''}
        </div>
      </div>
    `).join('') || '<p class="text-sm text-muted">No tasks</p>';
  });
}

document.getElementById('task-group-filter')?.addEventListener('change', loadTasks);

async function moveTask(id, status) {
  await supabase.from('tasks').update({ status }).eq('id', id);
  loadTasks();
}

function openCreateGroupModal() {
  // Load assignments for optional link
  loadAssignmentsForCreate();
  openModal('modal-create-group');
}

async function loadAssignmentsForCreate() {
  const { data } = await supabase
    .from('assignments')
    .select('id, title, course_unit_id')
    .eq('is_locked', false);
  const sel = document.getElementById('cg-assignment');
  sel.innerHTML = '<option value="">None – general study group</option>';
  (data || []).forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.dataset.course = a.course_unit_id;
    opt.textContent = a.title;
    sel.appendChild(opt);
  });
}

function openAddTaskModal() {
  openModal('modal-add-task');
}

function setupForms() {
  document.getElementById('form-create-group')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cg-name').value.trim();
    const course_unit_id = document.getElementById('cg-course').value;
    const assignment_id = document.getElementById('cg-assignment').value || null;
    const max_members = parseInt(document.getElementById('cg-max').value, 10);
    const visibility = document.getElementById('cg-visibility').value;
    const description = document.getElementById('cg-desc').value.trim();

    try {
      // Create group
      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          name,
          course_unit_id,
          assignment_id,
          max_members,
          visibility,
          description,
          leader_id: currentUser.id,
          leader_name: currentUser.full_name
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as leader member
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: currentUser.id,
        role: 'leader'
      });

      // Trigger Google Sheets sync (Edge Function)
      try {
        await supabase.functions.invoke('sync-to-sheets', {
          body: { event: 'group_created', group_id: group.id }
        });
      } catch (syncErr) {
        console.warn('Sheets sync skipped:', syncErr);
      }

      closeModal('modal-create-group');
      document.getElementById('form-create-group').reset();
      await loadDashboard();
      switchView('groups');
      document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
      document.querySelector('[data-view="groups"]').classList.add('active');

    } catch (err) {
      alert(err.message || 'Failed to create group');
      console.error(err);
    }
  });

  document.getElementById('form-add-task')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    const group_id = document.getElementById('task-group').value;
    const description = document.getElementById('task-desc').value.trim();

    const { error } = await supabase.from('tasks').insert({
      title,
      description,
      group_id,
      status: 'todo',
      created_by: currentUser.id
    });

    if (error) {
      alert(error.message);
      return;
    }
    closeModal('modal-add-task');
    document.getElementById('form-add-task').reset();
    loadTasks();
  });
}

async function joinGroup(groupId) {
  // Check capacity
  const { count } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId);

  const { data: group } = await supabase
    .from('groups')
    .select('max_members, is_locked')
    .eq('id', groupId)
    .single();

  if (group?.is_locked) {
    alert('Group formation is locked for this group.');
    return;
  }
  if (count >= (group?.max_members || 5)) {
    alert('This group is full.');
    return;
  }

  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: currentUser.id,
    role: 'member'
  });

  if (error) {
    alert(error.message.includes('duplicate') ? 'You are already in this group.' : error.message);
    return;
  }
  alert('Joined successfully!');
  await loadDashboard();
  loadBrowseGroups();
}

async function requestJoin(groupId) {
  const { error } = await supabase.from('join_requests').insert({
    group_id: groupId,
    user_id: currentUser.id,
    status: 'pending'
  });
  if (error) {
    alert(error.message.includes('duplicate') ? 'Request already sent.' : error.message);
    return;
  }
  alert('Join request sent. Wait for the group leader to approve.');
}

function createGroupForAssignment(assignmentId, courseUnitId) {
  openCreateGroupModal();
  setTimeout(() => {
    document.getElementById('cg-course').value = courseUnitId;
    document.getElementById('cg-assignment').value = assignmentId;
  }, 100);
}

function viewGroup(id) {
  // Simple focus: switch to my groups
  switchView('groups');
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  document.querySelector('[data-view="groups"]').classList.add('active');
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

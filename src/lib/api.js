/**
 * TaskFlow API Client
 */

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    let body = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await res.json();
    }
    if (!res.ok) {
      const message = body?.error || body?.message || `Request failed with status ${res.status}`;
      return { data: null, error: message };
    }
    return { data: body, error: null };
  } catch (err) {
    console.error('[api] fetch error:', err);
    return { data: null, error: 'Network error. Please check your connection.' };
  }
}

export async function getTasks(params = {}) {
  const { completed, priority, category, search, page = 1, pageSize = 50 } = params;
  const qs = new URLSearchParams();
  if (completed !== undefined) qs.set('completed', String(completed));
  if (priority)               qs.set('priority', priority);
  if (category)               qs.set('category', category);
  if (search)                 qs.set('search', search);
  qs.set('page', String(Math.max(1, page)));
  qs.set('pageSize', String(Math.min(100, Math.max(1, pageSize))));
  const query = qs.toString();
  return apiFetch(`/api/tasks${query ? `?${query}` : ''}`);
}

export async function createTask(payload) {
  return apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateTask(taskId, payload) {
  if (!taskId) return { data: null, error: 'Task ID is required.' };
  return apiFetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function toggleTaskCompletion(taskId, isCompleted) {
  return updateTask(taskId, { is_completed: isCompleted });
}

export async function deleteTask(taskId) {
  if (!taskId) return { data: null, error: 'Task ID is required.' };
  return apiFetch(`/api/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
}

export async function reorderTasks(payload) {
  if (!payload?.updates?.length) return { data: null, error: 'No updates provided.' };
  return apiFetch('/api/tasks/reorder', { method: 'PUT', body: JSON.stringify(payload) });
}

export function buildPaginationMeta(total, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    total,
  };
}

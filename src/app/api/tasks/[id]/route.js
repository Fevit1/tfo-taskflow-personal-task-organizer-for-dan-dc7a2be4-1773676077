import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { sanitizeText } from '@/lib/sanitize';
import { isValidUUID } from '@/lib/validate';

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  is_completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  category: z.string().trim().max(100).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
}).strict().refine((obj) => Object.keys(obj).length > 0, { message: 'At least one field must be provided.' });

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid task ID.' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

    const parseResult = updateTaskSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Validation failed.', details: parseResult.error.flatten().fieldErrors }, { status: 422 });
    }

    const updates = { ...parseResult.data };
    if (updates.title !== undefined) {
      updates.title = sanitizeText(updates.title);
      if (!updates.title) return NextResponse.json({ error: 'Title cannot be empty after sanitization.' }, { status: 422 });
    }
    if (updates.description != null) updates.description = sanitizeText(updates.description);
    if (updates.category != null) updates.category = sanitizeText(updates.category);

    const { data: task, error: dbError } = await supabase.from('tasks')
      .update(updates).eq('id', id).select().single();

    if (dbError) {
      if (dbError.code === 'PGRST116') return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
      console.error('[PUT /api/tasks/[id]] db error:', dbError.message);
      return NextResponse.json({ error: 'Failed to update task.' }, { status: 500 });
    }
    if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });

    return NextResponse.json(task);
  } catch (err) {
    console.error('[PUT /api/tasks/[id]] unexpected error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid task ID.' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { data: deleted, error: dbError } = await supabase.from('tasks')
      .delete().eq('id', id).select('id').single();

    if (dbError) {
      if (dbError.code === 'PGRST116') return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
      console.error('[DELETE /api/tasks/[id]] db error:', dbError.message);
      return NextResponse.json({ error: 'Failed to delete task.' }, { status: 500 });
    }
    if (!deleted) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/tasks/[id]] unexpected error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

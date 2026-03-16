import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { isValidUUID } from '@/lib/validate';

const reorderSchema = z.object({
  updates: z.array(
    z.object({
      id:         z.string().refine(isValidUUID, { message: 'Each id must be a valid UUID.' }),
      sort_order: z.number().int().min(0),
    })
  ).min(1).max(200),
});

export async function PUT(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

    const parseResult = reorderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Validation failed.', details: parseResult.error.flatten().fieldErrors }, { status: 422 });
    }

    const { updates } = parseResult.data;
    const results = await Promise.allSettled(
      updates.map(({ id, sort_order }) =>
        supabase.from('tasks').update({ sort_order }).eq('id', id).select('id')
      )
    );

    const updatedCount = results.filter(
      (r) => r.status === 'fulfilled' && !r.value.error && (r.value.data?.length ?? 0) > 0
    ).length;

    return NextResponse.json({ success: true, updated: updatedCount });
  } catch (err) {
    console.error('[PUT /api/tasks/reorder] unexpected error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * تخزين اشتراكات Push في الذاكرة (للعرض).
 * في الإنتاج يجب حفظها في جدول push_subscriptions بقاعدة البيانات.
 */
declare global {
  
  var __push_subs: PushSubscriptionJSON[] | undefined;
}
const subs: PushSubscriptionJSON[] = (globalThis.__push_subs ??= []);

async function sendNotification(sub: PushSubscriptionJSON, payload: { title: string; body: string; tag?: string; url?: string }) {
  if (!sub.endpoint) return;
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      ...(process.env.VAPID_SUBJECT && { TTL: '86400' }),
    },
    body: JSON.stringify({
      title: payload.title,
      body: payload.body,
      tag: payload.tag,
      data: { url: payload.url ?? '/' },
    }),
  });
  if (res.status === 410) {
    // اشتراك منتهي الصلاحية — احذفه
    const idx = subs.findIndex((s) => s.endpoint === sub.endpoint);
    if (idx >= 0) subs.splice(idx, 1);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'subscribe' && body.subscription) {
      const sub = body.subscription as PushSubscriptionJSON;
      if (!subs.find((s) => s.endpoint === sub.endpoint)) subs.push(sub);
      return NextResponse.json({ success: true, total: subs.length });
    }

    if (body.action === 'unsubscribe' && body.endpoint) {
      const idx = subs.findIndex((s) => s.endpoint === body.endpoint);
      if (idx >= 0) subs.splice(idx, 1);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'send' || body.title) {
      const { title, body: text, tag, url } = body;
      if (!title) return NextResponse.json({ error: 'العنوان مطلوب' }, { status: 400 });
      await Promise.all(subs.map((s) => sendNotification(s, { title, body: text, tag, url })));
      return NextResponse.json({ success: true, sent: subs.length });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'خطأ' }, { status: 500 });
  }
}

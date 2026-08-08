import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * مسار خادم (Server-Side Proxy) لطلبات الذكاء الاصطناعي.
 * المفتاح يبقى محمياً على الخادم ولا يصل إلى المتصفح أبداً.
 *
 * body: { provider, model, prompt, image?: dataUrl, apiKey? }
 * في وضع Supabase: يقرأ المفتاح من جدول ai_settings.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider = 'gemini', model, prompt, image } = body;

    // في وضع Supabase، اقرأ المفتاح من قاعدة البيانات (لا يُرسَل من العميل).
    // هنا نسمح بتمرير المفتاح في وضع العرض/التطوير فقط.
    let apiKey = body.apiKey || '';
    if (!apiKey && process.env.GEMINI_API_KEY && provider === 'gemini') {
      apiKey = process.env.GEMINI_API_KEY;
    }
    if (!apiKey && process.env.OPENAI_API_KEY && provider === 'openai') {
      apiKey = process.env.OPENAI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'مفتاح API غير مضبوط. أضِفه من إعدادات الذكاء الاصطناعي أو متغيرات البيئة.' },
        { status: 400 },
      );
    }

    let text = '';

    if (provider === 'openai') {
      const content: any[] = [{ type: 'text', text: prompt }];
      if (image) {
        const m = image.match(/^data:(.+);base64,(.+)$/);
        if (m) content.push({ type: 'image_url', image_url: { url: image } });
      }
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [{ role: 'user', content }],
          temperature: 0.2,
        }),
      });
      if (!res.ok) return NextResponse.json({ error: `OpenAI ${res.status}` }, { status: res.status });
      const data = await res.json();
      text = data?.choices?.[0]?.message?.content ?? '';
    } else {
      // Gemini (افتراضي)
      const parts: any[] = [{ text: prompt }];
      if (image) {
        const m = image.match(/^data:(.+);base64,(.+)$/);
        if (m) parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
        },
      );
      if (!res.ok) return NextResponse.json({ error: `Gemini ${res.status}` }, { status: res.status });
      const data = await res.json();
      text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }

    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'خطأ في خدمة الذكاء الاصطناعي' }, { status: 500 });
  }
}

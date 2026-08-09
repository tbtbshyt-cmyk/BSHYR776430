import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// حد أقصى لمعالجة دفعات الصور (10 صور)
export const maxDuration = 120;

type Provider = 'gemini' | 'openai' | 'openrouter';

interface ProviderConfig {
  name: Provider;
  key: string;
  model: string;
  baseUrl: string;
}

/**
 * يبني قائمة المزودين بالترتيب: المطلوب أولاً، ثم البدائل المتاحة
 * للسماح بالتكرار التلقائي (failover) عند تعطل أحد المزوّدين.
 */
function buildProviders(
  preferred: Provider,
  model?: string,
  clientKey?: string,
): ProviderConfig[] {
  const list: ProviderConfig[] = [];
  const seen = new Set<Provider>();

  const add = (p: Provider, key: string | undefined, m: string, baseUrl: string) => {
    if (!key || seen.has(p)) return;
    seen.add(p);
    list.push({ name: p, key, model: m, baseUrl });
  };

  if (preferred === 'openai') {
    add('openai', clientKey || process.env.OPENAI_API_KEY, model || 'gpt-4o-mini', 'https://api.openai.com/v1');
  } else if (preferred === 'openrouter') {
    add('openrouter', clientKey || process.env.OPENROUTER_API_KEY, model || 'openai/gpt-4o-mini', 'https://openrouter.ai/api/v1');
  } else {
    add('gemini', clientKey || process.env.GEMINI_API_KEY, model || 'gemini-1.5-flash', 'https://generativelanguage.googleapis.com');
  }

  add('gemini', process.env.GEMINI_API_KEY, model || 'gemini-1.5-flash', 'https://generativelanguage.googleapis.com');
  add('openai', process.env.OPENAI_API_KEY, 'gpt-4o-mini', 'https://api.openai.com/v1');
  add('openrouter', process.env.OPENROUTER_API_KEY, 'openai/gpt-4o-mini', 'https://openrouter.ai/api/v1');

  return list;
}

async function callProvider(
  cfg: ProviderConfig,
  prompt: string,
  image?: { mime: string; b64: string },
): Promise<string> {
  if (cfg.name === 'gemini') {
    const parts: any[] = [{ text: prompt }];
    if (image) parts.push({ inline_data: { mime_type: image.mime, data: image.b64 } });
    const res = await fetch(
      `${cfg.baseUrl}/v1beta/models/${cfg.model}:generateContent?key=${cfg.key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('استجابة Gemini فارغة');
    return text;
  }

  const content: any[] = [{ type: 'text', text: prompt }];
  if (image) content.push({ type: 'image_url', image_url: { url: `data:${image.mime};base64,${image.b64}` } });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.key}`,
  };
  if (cfg.name === 'openrouter') {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_SITE_URL || 'https://abubashar.com';
    headers['X-Title'] = 'Abu Bashar AI';
  }
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content }], temperature: 0.2 }),
  });
  if (!res.ok) throw new Error(`${cfg.name} ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`استجابة ${cfg.name} فارغة`);
  return text;
}

async function callWithFailover(
  providers: ProviderConfig[],
  prompt: string,
  image?: { mime: string; b64: string },
) {
  const errors: string[] = [];
  for (const cfg of providers) {
    try {
      const text = await callProvider(cfg, prompt, image);
      return { text, provider: cfg.name, errors };
    } catch (e: any) {
      errors.push(`${cfg.name}: ${e?.message ?? 'خطأ'}`);
    }
  }
  throw new Error('فشلت جميع مزودات الذكاء الاصطناعي: ' + errors.join(' | '));
}

function extractJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  const arr = text.match(/\[[\s\S]*\]/);
  if (arr) return JSON.parse(arr[0]);
  throw new Error('لم يتمكن الذكاء الاصطناعي من إرجاع JSON صالح');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider = 'gemini', model, prompt, image, images, action, apiKey, categories } = body;

    // استخراج جماعي لمنتجات من حتى 10 صور
    if (action === 'extract_products' && Array.isArray(images)) {
      if (images.length > 10) {
        return NextResponse.json({ error: 'الحد الأقصى 10 صور' }, { status: 400 });
      }
      const providers = buildProviders(provider, model, apiKey);
      const catList = Array.isArray(categories)
        ? categories.map((c: any) => `${c.id}=${c.name_ar}`).join('، ')
        : '';
      const results = [];
      for (const item of images.slice(0, 10)) {
        const m = String(item.url || item).match(/^data:(.+);base64,(.+)$/);
        if (!m) continue;
        const p = `حلّل صورة المنتج وأخرج JSON فقط: {"title_ar":"...","description_ar":"...","price":رقم,"compare_at_price":رقم أو null,"category_id":"أقرب معرف من: ${catList}","sizes":["مقاسات"]}. لا تضف شرحاً خارج JSON.`;
        const { text, provider: used } = await callWithFailover(providers, p, { mime: m[1], b64: m[2] });
        const obj = extractJson(text);
        results.push({
          title_ar: obj.title_ar,
          description_ar: obj.description_ar,
          price: Number(obj.price) || 0,
          compare_at_price: obj.compare_at_price ? Number(obj.compare_at_price) : null,
          category_id: obj.category_id ?? null,
          sizes: Array.isArray(obj.sizes) ? obj.sizes : ['one-size'],
          image: item.url || item,
          provider: used,
        });
      }
      return NextResponse.json({ products: results });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'نص الطلب مطلوب' }, { status: 400 });
    }

    const providers = buildProviders(provider, model, apiKey);
    const imgMatch = image?.match(/^data:(.+);base64,(.+)$/);
    const img = imgMatch ? { mime: imgMatch[1], b64: imgMatch[2] } : undefined;

    const { text, provider: used, errors } = await callWithFailover(providers, prompt, img);
    return NextResponse.json({ text, provider: used, fallbackErrors: errors });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'خطأ في خدمة الذكاء الاصطناعي' }, { status: 500 });
  }
}

'use client';

import { supabase, isSupabaseConfigured } from './supabase';
import type { Campaign } from './types';

export interface AiConfig {
  provider: 'gemini' | 'openai';
  apiKey: string;
  model: string;
}

export interface ExtractedProduct {
  title_ar: string;
  description_ar: string;
  category_id: string | null;
  price: number;
  compare_at_price: number | null;
  barcode: string;
  stock_quantity: number;
  sizes: string[];
  is_featured: boolean;
}

export interface AiAction {
  type: 'create_product' | 'create_campaign' | 'answer';
  product?: ExtractedProduct;
  campaign?: Partial<Campaign>;
  message: string;
}

/** جلب الإعدادات (المفتاح يُعاد فقط إن كان في localStorage demo). */
export async function getAiConfig(): Promise<AiConfig> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await (supabase as any).from('ai_settings').select('*').eq('id', 1).single();
    return {
      provider: data?.provider ?? 'gemini',
      apiKey: '',
      model: data?.model ?? 'gemini-1.5-flash',
    };
  }
  const raw = localStorage.getItem('abubashar-ai-config');
  const cfg = raw ? JSON.parse(raw) : {};
  return {
    provider: cfg.provider ?? 'gemini',
    apiKey: cfg.apiKey ?? '',
    model: cfg.model ?? 'gemini-1.5-flash',
  };
}

export async function saveAiConfig(cfg: AiConfig & { features?: string[]; whatsapp?: { enabled: boolean; number: string; template: string } }) {
  if (isSupabaseConfigured && supabase) {
    await (supabase as any).from('ai_settings').update({
      provider: cfg.provider,
      model: cfg.model,
      api_key_encrypted: cfg.apiKey || null,
      features: cfg.features,
      whatsapp_enabled: cfg.whatsapp?.enabled,
      whatsapp_number: cfg.whatsapp?.number,
      order_template: cfg.whatsapp?.template,
    }).eq('id', 1);
    return;
  }
  localStorage.setItem('abubashar-ai-config', JSON.stringify(cfg));
  if (cfg.whatsapp) localStorage.setItem('abubashar-whatsapp', JSON.stringify(cfg.whatsapp));
}

/** تحويل صورة إلى base64 لإرسالها للنموذج. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function callAi(cfg: AiConfig, prompt: string, imageDataUrl?: string): Promise<string> {
  // نمرّر الطلب عبر مسار الخادم لإبقاء المفتاح محمياً وتجنّب قيود CSP.
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: cfg.provider,
      model: cfg.model,
      prompt,
      image: imageDataUrl,
      // يُستخدم فقط في وضع العرض/التطوير؛ في الإنتاج يُقرأ المفتاح من الخادم.
      apiKey: cfg.apiKey,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `AI error ${res.status}`);
  return data?.text ?? '';
}

function extractJson(text: string): any {
  // يزيل أي أسطر شارحة ويستخرج كتلة JSON
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('لم يتمكن الذكاء الاصطناعي من إرجاع بيانات صالحة');
  return JSON.parse(match[0]);
}

/** استخراج بيانات منتج من صورة. */
export async function extractProductFromImage(
  file: File,
  cfg: AiConfig,
  categories: { id: string; name_ar: string }[],
): Promise<ExtractedProduct> {
  const dataUrl = await fileToDataUrl(file);
  const catList = categories.map((c) => `${c.id}=${c.name_ar}`).join('، ');
  const prompt = `أنت مساعد في متجر ملابس وأحذية. حلّل الصورة وأخرج JSON فقط بهذا الشكل:
{
 "title_ar": "اسم المنتج",
 "description_ar": "وصف قصير جذاب",
 "category_id": "معرف الفئة المناسب من هذه القائمة: ${catList}",
 "price": رقم بالريال اليمني,
 "compare_at_price": رقم أو null,
 "barcode": "13 رقم أو نص فارغ",
 "stock_quantity": رقم,
 "sizes": ["مقاسات مناسبة"],
 "is_featured": true/false
}
لا تضف أي شرح خارج JSON.`;

  const text = await callAi(cfg, prompt, dataUrl);
  const obj = extractJson(text);
  return {
    title_ar: obj.title_ar ?? 'منتج جديد',
    description_ar: obj.description_ar ?? '',
    category_id: obj.category_id ?? categories[0]?.id ?? null,
    price: Number(obj.price) || 0,
    compare_at_price: obj.compare_at_price ? Number(obj.compare_at_price) : null,
    barcode: String(obj.barcode ?? ''),
    stock_quantity: Number(obj.stock_quantity) ?? 0,
    sizes: Array.isArray(obj.sizes) ? obj.sizes : ['one-size'],
    is_featured: Boolean(obj.is_featured),
  };
}

/** تنفيذ أمر نصي (مثل إنشاء حملة). */
export async function runCommand(
  instruction: string,
  cfg: AiConfig,
): Promise<AiAction> {
  const prompt = `أنت مساعد متجر. إن كان الطلب إنشاء حملة/خصم، أخرج JSON بالشكل:
{"type":"create_campaign","campaign":{"name":"...","type":"percentage|fixed|bogo","value":رقم,"product_ids":[],"starts_at":"ISO","ends_at":"ISO","is_active":true},"message":"ملخص"}
وإلا أخرج: {"type":"answer","message":"الإجابة"}.
طلب المستخدم: ${instruction}`;
  const text = await callAi(cfg, prompt);
  try {
    return extractJson(text) as AiAction;
  } catch {
    return { type: 'answer', message: text };
  }
}

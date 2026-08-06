import Link from 'next/link';
import type { ReactNode } from 'react';

export interface ContentSection {
  heading: string;
  body: string | string[];
}

export function ContentLayout({
  title,
  intro,
  sections,
  children,
}: {
  title: string;
  intro?: string;
  sections?: ContentSection[];
  children?: ReactNode;
}) {
  return (
    <article className="container-x py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-stone-400 hover:text-gold-300">
          ← الرئيسية
        </Link>
        <h1 className="mt-4 font-display text-3xl font-black sm:text-4xl">{title}</h1>
        {intro && <p className="divider-gold mt-3" />}
        {intro && (
          <p className="mt-5 text-lg leading-9 text-stone-300">{intro}</p>
        )}

        {sections && (
          <div className="mt-10 space-y-8">
            {sections.map((s) => (
              <section key={s.heading}>
                <h2 className="font-display text-xl font-bold text-gold-300">{s.heading}</h2>
                {Array.isArray(s.body) ? (
                  <ul className="mt-3 space-y-2">
                    {s.body.map((line, i) => (
                      <li key={i} className="flex gap-2 leading-8 text-stone-300">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold-400" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 leading-8 text-stone-300">{s.body}</p>
                )}
              </section>
            ))}
          </div>
        )}

        {children}
      </div>
    </article>
  );
}

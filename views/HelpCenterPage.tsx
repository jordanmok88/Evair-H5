/**
 * HelpCenterPage — Phase 4 support content surface.
 *
 * Two modes via the `slug` prop:
 *   - `null`     → category index at `/help`
 *   - `'…slug…'` → article detail at `/help/{slug}`
 *
 * Why static articles (instead of a CMS):
 *   - 90% of support volume hits 10 articles. We ship those 10 in
 *     code, version-control them, get to ship updates with the same
 *     PR process as the app.
 *   - Renders on first paint — Googlebot indexes deterministically.
 *   - Zero runtime cost, no auth dependency.
 *
 * If the article catalogue grows past ~50 entries, this is the moment
 * to introduce a CMS (Sanity / Contentful / Notion). Until then,
 * `data/helpArticles.ts` is fine.
 *
 * @see data/helpArticles.ts
 * @see components/article/ArticleBlocks.tsx
 * @see docs/EVAIRSIM_ROADMAP_ZH.md §六 Phase 4
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Search,
    BookOpen,
    Clock,
    AlertCircle,
} from 'lucide-react';
import {
    HELP_ARTICLES,
    HELP_CATEGORIES,
    findArticle,
    articlesByCategory,
    type HelpArticle,
    type HelpCategory,
} from '../data/helpArticles';
import ArticleBlocks from '../components/article/ArticleBlocks';

interface HelpCenterPageProps {
    slug: string | null;
}

const HelpCenterPage: React.FC<HelpCenterPageProps> = ({ slug }) => {
    const article = slug ? findArticle(slug) : undefined;

    useEffect(() => {
        if (article) {
            document.title = `${article.title} — Evair Help`;
            setMeta(article.summary);
        } else {
            document.title = 'Help center — Evair';
            setMeta(
                'Setup guides, troubleshooting, billing, and refunds. Find an answer or open a chat with us.',
            );
        }
    }, [article]);

    return (
        <div className="min-h-screen bg-white text-slate-900">
            <SharedHeader currentSection={article ? 'help' : 'help'} />

            {slug && !article ? (
                <NotFound slug={slug} />
            ) : article ? (
                <ArticleDetail article={article} />
            ) : (
                <HelpIndex />
            )}

            <SharedFooter />
        </div>
    );
};

// ─── index mode ─────────────────────────────────────────────────────

const HelpIndex: React.FC = () => {
    const [query, setQuery] = useState('');
    const grouped = useMemo(() => articlesByCategory(), []);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return null;
        return HELP_ARTICLES.filter(
            a =>
                a.title.toLowerCase().includes(q) ||
                a.summary.toLowerCase().includes(q),
        );
    }, [query]);

    return (
        <>
            {/* Hero with search */}
            <section className="px-4 md:px-8 py-12 md:py-16 max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                    <BookOpen size={12} /> Help center
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-5">
                    How can we help?
                </h1>
                <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
                    Setup guides, troubleshooting, billing, and refunds. If you cannot
                    find an answer, open a chat with us in the app.
                </p>

                <div className="relative max-w-xl mx-auto">
                    <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="search"
                        placeholder="Search help articles…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 text-slate-900 bg-white border border-slate-300 rounded-2xl focus:border-orange-400 focus:outline-none text-base"
                    />
                </div>
            </section>

            {/* Search results — only when there's a query */}
            {filtered !== null && (
                <section className="px-4 md:px-8 pb-12 max-w-4xl mx-auto">
                    {filtered.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            No articles match <strong>{query}</strong>. Try different words,
                            or{' '}
                            <a
                                href="/app#contact"
                                className="text-orange-600 underline-offset-2 hover:underline"
                            >
                                open a chat
                            </a>
                            .
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {filtered.map(a => (
                                <ArticleCard key={a.slug} article={a} />
                            ))}
                        </ul>
                    )}
                </section>
            )}

            {/* Category sections — hidden during active search */}
            {filtered === null && (
                <section className="px-4 md:px-8 pb-16 max-w-5xl mx-auto">
                    {HELP_CATEGORIES.map(cat => {
                        const list = grouped[cat.key];
                        if (!list?.length) return null;
                        return (
                            <div key={cat.key} className="mb-10">
                                <div className="mb-4">
                                    <h2 className="text-xl font-bold text-slate-900">{cat.title}</h2>
                                    <p className="text-sm text-slate-500">{cat.blurb}</p>
                                </div>
                                <ul className="space-y-3">
                                    {list.map(a => (
                                        <ArticleCard key={a.slug} article={a} />
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </section>
            )}

            {/* Still stuck */}
            <section className="px-4 md:px-8 py-12 bg-slate-50">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-extrabold mb-2">
                        Still stuck?
                    </h2>
                    <p className="text-slate-600 mb-6">
                        Open a chat in the app — most questions are answered in under 5
                        minutes by a real person.
                    </p>
                    <a
                        href="/app#contact"
                        className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-orange-500/20"
                    >
                        Talk to support <ArrowRight size={18} />
                    </a>
                </div>
            </section>
        </>
    );
};

const ArticleCard: React.FC<{ article: HelpArticle }> = ({ article }) => (
    <li>
        <a
            href={`/help/${article.slug}`}
            className="block bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all rounded-2xl p-5"
        >
            <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 mb-1">{article.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-2">
                        {article.summary}
                    </p>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={11} /> {article.readMinutes} min read
                    </div>
                </div>
                <ArrowRight size={18} className="text-slate-300 mt-1 shrink-0" />
            </div>
        </a>
    </li>
);

// ─── detail mode ────────────────────────────────────────────────────

const ArticleDetail: React.FC<{ article: HelpArticle }> = ({ article }) => {
    const categoryMeta = HELP_CATEGORIES.find(c => c.key === article.category);
    const related = useMemo(
        () =>
            HELP_ARTICLES.filter(
                a => a.category === article.category && a.slug !== article.slug,
            ).slice(0, 3),
        [article],
    );

    return (
        <article className="px-4 md:px-8 py-10 max-w-3xl mx-auto">
            <a
                href="/help"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6"
            >
                <ArrowLeft size={14} /> All help articles
            </a>

            <div className="text-xs uppercase tracking-wider font-bold text-orange-600 mb-2">
                {categoryMeta?.title ?? article.category}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight mb-3">
                {article.title}
            </h1>
            <div className="text-sm text-slate-500 mb-8 flex items-center gap-3">
                <span className="flex items-center gap-1">
                    <Clock size={12} /> {article.readMinutes} min read
                </span>
                <span>·</span>
                <span>Updated {formatDate(article.updatedAt)}</span>
            </div>

            <ArticleBlocks blocks={article.body} />

            {/* Still stuck callout */}
            <div className="mt-12 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                <div className="font-bold text-slate-900 mb-1">Did this help?</div>
                <p className="text-sm text-slate-600 mb-3">
                    If your situation is different, open a chat — a real person will get
                    back to you in minutes.
                </p>
                <a
                    href="/app#contact"
                    className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
                >
                    Talk to support <ArrowRight size={14} />
                </a>
            </div>

            {/* Related */}
            {related.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-xl font-bold text-slate-900 mb-3">
                        Related articles
                    </h2>
                    <ul className="space-y-3">
                        {related.map(a => (
                            <ArticleCard key={a.slug} article={a} />
                        ))}
                    </ul>
                </div>
            )}
        </article>
    );
};

// ─── 404 / unknown slug ─────────────────────────────────────────────

const NotFound: React.FC<{ slug: string }> = ({ slug }) => (
    <section className="px-4 md:px-8 py-16 max-w-xl mx-auto text-center">
        <AlertCircle size={36} className="text-orange-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Article not found</h1>
        <p className="text-slate-600 mb-6">
            We don't have an article at <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">/help/{slug}</code>.
            It may have moved, or the link may be wrong.
        </p>
        <a
            href="/help"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-semibold px-5 py-2.5 rounded-xl"
        >
            Back to help center <ArrowRight size={16} />
        </a>
    </section>
);

// ─── shared chrome (reused by BlogPage too — see SharedHeader/Footer) ─

export const SharedHeader: React.FC<{ currentSection?: 'help' | 'blog' | null }> = ({
    currentSection = null,
}) => (
    <header className="sticky top-0 bg-white/90 backdrop-blur-md z-30 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
                <span className="inline-block w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400" />
                Evair
            </a>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                <a href="/sim/phone" className="hover:text-slate-900">Phone</a>
                <a href="/sim/camera" className="hover:text-slate-900">Camera</a>
                <a href="/sim/iot" className="hover:text-slate-900">IoT</a>
                <a href="/travel-esim" className="hover:text-slate-900">Travel eSIM</a>
                <a
                    href="/help"
                    className={
                        currentSection === 'help'
                            ? 'text-orange-600 font-semibold'
                            : 'hover:text-slate-900'
                    }
                >
                    Help
                </a>
                <a
                    href="/blog"
                    className={
                        currentSection === 'blog'
                            ? 'text-orange-600 font-semibold'
                            : 'hover:text-slate-900'
                    }
                >
                    Blog
                </a>
            </nav>
            <a
                href="/app"
                className="text-sm font-semibold text-orange-600 hover:text-orange-700"
            >
                Open app →
            </a>
        </div>
    </header>
);

export const SharedFooter: React.FC = () => (
    <footer className="bg-slate-900 text-slate-400 px-4 md:px-8 py-8 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-2">
                <span className="inline-block w-6 h-6 rounded-md bg-gradient-to-br from-orange-500 to-amber-400" />
                <span className="font-semibold text-white">Evair Digital</span>
                <span>© {new Date().getFullYear()}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 justify-center">
                <a href="/welcome" className="hover:text-white">Home</a>
                <a href="/sim/phone" className="hover:text-white">Phone</a>
                <a href="/sim/camera" className="hover:text-white">Camera</a>
                <a href="/sim/iot" className="hover:text-white">IoT</a>
                <a href="/travel-esim" className="hover:text-white">Travel eSIM</a>
                <a href="/help" className="hover:text-white">Help</a>
                <a href="/blog" className="hover:text-white">Blog</a>
                <a href="mailto:service@evairdigital.com" className="hover:text-white">
                    Support
                </a>
            </div>
        </div>
    </footer>
);

// ─── helpers ────────────────────────────────────────────────────────

function setMeta(content: string): void {
    const tag = document.querySelector('meta[name="description"]');
    if (tag) {
        tag.setAttribute('content', content);
    } else {
        const m = document.createElement('meta');
        m.name = 'description';
        m.content = content;
        document.head.appendChild(m);
    }
}

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
}

export default HelpCenterPage;

/**
 * BlogPage — Phase 4 long-form content surface.
 *
 * Two modes via the `slug` prop:
 *   - `null`     → index at `/blog`  (post list, tag filter)
 *   - `'…slug…'` → post detail at `/blog/{slug}`
 *
 * Content lives in `data/blogPosts.ts`. Same shape as help articles
 * so the renderer is shared (`components/article/ArticleBlocks`).
 *
 * SEO note: each post sets a unique `<title>` and meta description.
 * For full Open Graph / structured data we would need SSR — punt to
 * the Vue/Next migration if/when SEO traffic justifies it.
 *
 * @see data/blogPosts.ts
 * @see views/HelpCenterPage.tsx
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock, User, Tag, AlertCircle } from 'lucide-react';
import {
    BLOG_POSTS,
    BLOG_TAGS,
    POSTS_NEWEST_FIRST,
    findPost,
    type BlogPost,
    type BlogTag,
} from '../data/blogPosts';
import ArticleBlocks from '../components/article/ArticleBlocks';
import { SharedHeader, SharedFooter } from './HelpCenterPage';

interface BlogPageProps {
    slug: string | null;
}

const BlogPage: React.FC<BlogPageProps> = ({ slug }) => {
    const post = slug ? findPost(slug) : undefined;

    useEffect(() => {
        if (post) {
            document.title = `${post.title} — Evair Blog`;
            setMeta(post.summary);
        } else {
            document.title = 'Evair Blog — Travel eSIMs, US SIMs, IoT';
            setMeta(
                'Honest guides on travel eSIMs, US SIMs, IoT data plans, and how to actually save money on mobile data.',
            );
        }
    }, [post]);

    return (
        <div className="min-h-screen bg-white text-slate-900">
            <SharedHeader currentSection="blog" />

            {slug && !post ? (
                <NotFound slug={slug} />
            ) : post ? (
                <PostDetail post={post} />
            ) : (
                <BlogIndex />
            )}

            <SharedFooter />
        </div>
    );
};

// ─── index ──────────────────────────────────────────────────────────

const BlogIndex: React.FC = () => {
    const [activeTag, setActiveTag] = useState<BlogTag | null>(null);
    const visible = useMemo(
        () =>
            activeTag
                ? POSTS_NEWEST_FIRST.filter(p => p.tags.includes(activeTag))
                : POSTS_NEWEST_FIRST,
        [activeTag],
    );

    return (
        <>
            <section className="px-4 md:px-8 py-12 md:py-16 max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                    <Tag size={12} /> Evair Blog
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4">
                    Honest guides for connected travel
                </h1>
                <p className="text-lg text-slate-600 max-w-xl mx-auto">
                    No affiliate-fluff comparisons, no exaggerated speed claims. Just
                    the things our team actually wants you to know before you buy a
                    plan.
                </p>
            </section>

            {/* Tag filter */}
            <section className="px-4 md:px-8 max-w-5xl mx-auto">
                <div className="flex flex-wrap gap-2 mb-8 justify-center">
                    <TagPill
                        label="All"
                        active={activeTag === null}
                        onClick={() => setActiveTag(null)}
                    />
                    {BLOG_TAGS.map(t => (
                        <TagPill
                            key={t.key}
                            label={t.label}
                            active={activeTag === t.key}
                            onClick={() => setActiveTag(t.key)}
                        />
                    ))}
                </div>
            </section>

            {/* Posts grid */}
            <section className="px-4 md:px-8 pb-16 max-w-5xl mx-auto">
                {visible.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        No posts in this tag yet — check back soon.
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {visible.map(p => (
                            <PostCard key={p.slug} post={p} />
                        ))}
                    </ul>
                )}
            </section>
        </>
    );
};

const TagPill: React.FC<{
    label: string;
    active: boolean;
    onClick: () => void;
}> = ({ label, active, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            active
                ? 'bg-orange-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
    >
        {label}
    </button>
);

const PostCard: React.FC<{ post: BlogPost }> = ({ post }) => (
    <li>
        <a
            href={`/blog/${post.slug}`}
            className="block h-full bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all rounded-2xl p-6"
        >
            <div className="flex flex-wrap items-center gap-2 mb-3">
                {post.tags.slice(0, 2).map(t => (
                    <span
                        key={t}
                        className="text-[11px] font-semibold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"
                    >
                        {BLOG_TAGS.find(x => x.key === t)?.label ?? t}
                    </span>
                ))}
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2 leading-snug">
                {post.title}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-3">
                {post.summary}
            </p>
            <div className="text-xs text-slate-500 flex items-center gap-3">
                <span className="flex items-center gap-1">
                    <User size={11} /> {post.author}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                    <Clock size={11} /> {post.readMinutes} min
                </span>
                <span>·</span>
                <span>{formatDate(post.publishedAt)}</span>
            </div>
        </a>
    </li>
);

// ─── detail ─────────────────────────────────────────────────────────

const PostDetail: React.FC<{ post: BlogPost }> = ({ post }) => {
    const related = useMemo(
        () =>
            BLOG_POSTS.filter(
                p =>
                    p.slug !== post.slug &&
                    p.tags.some(t => post.tags.includes(t)),
            ).slice(0, 2),
        [post],
    );

    return (
        <article className="px-4 md:px-8 py-10 max-w-3xl mx-auto">
            <a
                href="/blog"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6"
            >
                <ArrowLeft size={14} /> All posts
            </a>

            <div className="flex flex-wrap items-center gap-2 mb-3">
                {post.tags.map(t => (
                    <span
                        key={t}
                        className="text-[11px] font-semibold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"
                    >
                        {BLOG_TAGS.find(x => x.key === t)?.label ?? t}
                    </span>
                ))}
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4">
                {post.title}
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-5">
                {post.summary}
            </p>
            <div className="text-sm text-slate-500 mb-10 flex items-center gap-3 pb-6 border-b border-slate-100">
                <span className="flex items-center gap-1">
                    <User size={12} /> {post.author}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                    <Clock size={12} /> {post.readMinutes} min read
                </span>
                <span>·</span>
                <span>{formatDate(post.publishedAt)}</span>
            </div>

            <ArticleBlocks blocks={post.body} />

            {/* Optional CTA */}
            {post.cta && (
                <div className="mt-12 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-6 text-center">
                    <div className="font-bold text-slate-900 mb-2 text-lg">
                        Ready to go?
                    </div>
                    <a
                        href={post.cta.href}
                        className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-orange-500/20"
                    >
                        {post.cta.label} <ArrowRight size={16} />
                    </a>
                </div>
            )}

            {related.length > 0 && (
                <div className="mt-14">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">
                        Keep reading
                    </h2>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {related.map(p => (
                            <PostCard key={p.slug} post={p} />
                        ))}
                    </ul>
                </div>
            )}
        </article>
    );
};

const NotFound: React.FC<{ slug: string }> = ({ slug }) => (
    <section className="px-4 md:px-8 py-16 max-w-xl mx-auto text-center">
        <AlertCircle size={36} className="text-orange-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Post not found</h1>
        <p className="text-slate-600 mb-6">
            We don't have a post at <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">/blog/{slug}</code>.
            It may have moved, or the link may be wrong.
        </p>
        <a
            href="/blog"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-semibold px-5 py-2.5 rounded-xl"
        >
            Back to the blog <ArrowRight size={16} />
        </a>
    </section>
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

export default BlogPage;

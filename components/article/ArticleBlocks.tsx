/**
 * ArticleBlocks — render an `ArticleBlock[]` (help articles + blog posts).
 *
 * Kept dumb on purpose: no state, no router awareness, no API. This
 * is the universal renderer for static long-form content. If we move
 * to a markdown lib later, only this file needs to change — the
 * Help/Blog pages keep working as long as they pass an array.
 *
 * Visual tokens match the rest of the marketing surfaces (slate +
 * orange, generous line-height, max-width capped for readability).
 *
 * @see data/helpArticles.ts
 * @see data/blogPosts.ts
 */

import React from 'react';
import { Info, AlertTriangle, Lightbulb } from 'lucide-react';
import type { ArticleBlock } from '../../data/helpArticles';

export interface ArticleBlocksProps {
    blocks: ArticleBlock[];
}

const NOTE_STYLES: Record<
    'info' | 'warn' | 'tip',
    { bg: string; border: string; text: string; Icon: typeof Info }
> = {
    info: {
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        text: 'text-sky-900',
        Icon: Info,
    },
    warn: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-900',
        Icon: AlertTriangle,
    },
    tip: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-900',
        Icon: Lightbulb,
    },
};

const ArticleBlocks: React.FC<ArticleBlocksProps> = ({ blocks }) => (
    <div className="prose-evair max-w-none">
        {blocks.map((block, i) => {
            switch (block.type) {
                case 'h2':
                    return (
                        <h2
                            key={i}
                            className="text-2xl md:text-3xl font-bold text-slate-900 mt-10 mb-3"
                        >
                            {block.text}
                        </h2>
                    );
                case 'h3':
                    return (
                        <h3
                            key={i}
                            className="text-xl font-bold text-slate-900 mt-6 mb-2"
                        >
                            {block.text}
                        </h3>
                    );
                case 'p':
                    return (
                        <p
                            key={i}
                            className="text-slate-700 leading-relaxed mb-4 text-[17px]"
                        >
                            {block.text}
                        </p>
                    );
                case 'ul':
                    return (
                        <ul
                            key={i}
                            className="list-disc pl-6 mb-5 space-y-2 text-slate-700 leading-relaxed text-[17px] marker:text-orange-400"
                        >
                            {block.items.map((item, j) => (
                                <li key={j}>{item}</li>
                            ))}
                        </ul>
                    );
                case 'ol':
                    return (
                        <ol
                            key={i}
                            className="list-decimal pl-6 mb-5 space-y-2 text-slate-700 leading-relaxed text-[17px] marker:text-orange-400 marker:font-bold"
                        >
                            {block.items.map((item, j) => (
                                <li key={j}>{item}</li>
                            ))}
                        </ol>
                    );
                case 'note': {
                    const s = NOTE_STYLES[block.tone];
                    return (
                        <div
                            key={i}
                            className={`my-6 rounded-2xl border ${s.bg} ${s.border} ${s.text} px-4 py-3 flex gap-3 items-start`}
                        >
                            <s.Icon size={18} className="shrink-0 mt-0.5" />
                            <p className="text-[15px] leading-relaxed">{block.text}</p>
                        </div>
                    );
                }
                default:
                    return null;
            }
        })}
    </div>
);

export default ArticleBlocks;

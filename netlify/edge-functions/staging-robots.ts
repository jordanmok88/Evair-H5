/**
 * Set X-Robots-Tag on Netlify hostnames (*.netlify.app) so previews are not indexed
 * as duplicate production content. Production on evairdigital.com is unaffected.
 */

import type { Context } from 'https://edge.netlify.com/';

export default async (request: Request, context: Context): Promise<Response | void> => {
    const host = request.headers.get('host') ?? '';
    if (!host.endsWith('.netlify.app')) {
        return undefined;
    }

    const res = await context.next();
    const headers = new Headers(res.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
    });
};

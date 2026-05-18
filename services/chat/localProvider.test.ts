import { describe, expect, test } from 'vitest';
import { createLocalProvider } from './localProvider';

describe('createLocalProvider', () => {
  test('clears in-memory messages when a new local conversation is opened', async () => {
    const provider = createLocalProvider();
    const first = await provider.ensureConversation();

    await provider.send({
      clientMsgId: 'msg-1',
      text: 'first draft',
    });

    expect(await provider.fetchMessages()).toMatchObject([
      { conversationId: first.id, text: 'first draft' },
    ]);

    await provider.ensureConversation();

    expect(await provider.fetchMessages()).toEqual([]);
  });
});

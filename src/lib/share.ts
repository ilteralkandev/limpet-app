import { Share } from 'react-native';

import type { Card } from '@/lib/rotation';

export async function shareCard(card: Card): Promise<void> {
  try {
    await Share.share({ message: `“${card.text}”\n\n— ${card.topicTitle} · Limpet` });
  } catch {
    // The user dismissing the share sheet is not an error worth surfacing.
  }
}

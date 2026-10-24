import { Linking } from 'react-native';

import type { Card } from '@/lib/rotation';

/**
 * Opens a Google search for the fact. Google shows its AI answer (Gemini-powered AI Overview)
 * on top for many queries. The AI Mode deep link (udm=50) is undocumented, so it is not used.
 */
export function explainUrl(card: Pick<Card, 'text'>): string {
  return `https://www.google.com/search?q=${encodeURIComponent(card.text)}&hl=tr`;
}

export async function explainCard(card: Card): Promise<void> {
  try {
    await Linking.openURL(explainUrl(card));
  } catch {
    // No browser available; nothing useful to tell the user.
  }
}

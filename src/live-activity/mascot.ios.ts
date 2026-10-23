import { Asset } from 'expo-asset';
import { Directory, File } from 'expo-file-system';
import { widgetsDirectory } from 'expo-widgets';

// The widget extension runs in its own process and cannot reach the app bundle, so the
// mascot PNG is copied once into the shared widgets directory (an App Group container).
const FILE_NAME = 'limpet-shell-v1.png';

let pending: Promise<string | null> | null = null;

/** file:// URI of the mascot inside the shared directory, or null if it could not be prepared. */
export function ensureMascot(): Promise<string | null> {
  pending ??= prepare().catch(() => {
    pending = null; // retry on the next card
    return null;
  });
  return pending;
}

async function prepare(): Promise<string> {
  const target = new File(new Directory(widgetsDirectory), FILE_NAME);
  if (target.exists) return target.uri;

  // Background tasks reach here only if the app never ran in the foreground; the bundled
  // asset is local in release builds, so this download is a no-op there.
  const asset = await Asset.fromModule(require('../../assets/mascot/shell.png')).downloadAsync();
  if (!asset.localUri) throw new Error('Mascot asset has no local file');
  new File(asset.localUri).copy(target);
  return target.uri;
}

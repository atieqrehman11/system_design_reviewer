/**
 * Copies text to the clipboard using the Clipboard API.
 * Returns true on success, false if the API is unavailable or permission is denied.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

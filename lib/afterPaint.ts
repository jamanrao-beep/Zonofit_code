/** Run after the next paint, so a button label can update before a slow screen opens. */
export function afterPaint(action: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(action);
  });
}

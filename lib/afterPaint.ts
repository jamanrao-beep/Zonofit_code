/** Run after the next paint, so a tap can show feedback before slow work starts. */
export function afterPaint(action: () => void) {
  let ran = false;
  const run = () => {
    if (ran) return;
    ran = true;
    action();
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
  // Some screens never emit a frame. Still run the action.
  setTimeout(run, 120);
}

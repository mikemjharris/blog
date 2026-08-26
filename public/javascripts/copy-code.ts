// Copy-to-clipboard buttons on post code blocks, added at runtime so posts stay
// plain HTML.

const COPIED_FEEDBACK_MS = 2000;

// `stroke` and `fill` come from the stylesheet so the icon follows the button colour.
const CLIPBOARD_ICON =
  '<svg class="copy-code-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<rect x="9" y="9" width="12" height="12" rx="2" />' +
  '<path d="M5 15V5a2 2 0 0 1 2-2h8" />' +
  '</svg>';

const TICK_ICON =
  '<svg class="copy-code-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path d="M4 12.5 9 18 20 6" />' +
  '</svg>';

/**
 * The element the button is positioned against. A `pre` scrolls its own overflow, so
 * the button has to sit outside it rather than inside the scrolling area — and posts
 * also use a bare block `code` with no `pre` around it.
 */
const outermost = (code: HTMLElement): HTMLElement => code.closest('pre') ?? code;

const showCopied = (button: JQuery<HTMLElement>): void => {
  button.addClass('copied').attr('aria-label', 'Copied').html(TICK_ICON);
  setTimeout(() => {
    button.removeClass('copied').attr('aria-label', 'Copy code').html(CLIPBOARD_ICON);
  }, COPIED_FEEDBACK_MS);
};

const addCopyButton = (block: HTMLElement): void => {
  // Read the text before the button exists, so the button can never end up in it.
  const text = (block.textContent ?? '').trim();
  if (!text) return;

  // A span rather than a div: bare code blocks live inside a `p`, which a div would
  // close early.
  const wrapper = $('<span class="code-block"></span>');
  $(block).wrap(wrapper);

  const button = $('<button type="button" class="copy-code" aria-label="Copy code"></button>')
    .html(CLIPBOARD_ICON)
    .on('click', () => {
      navigator.clipboard.writeText(text).then(
        () => showCopied(button),
        (err: unknown) => {
          console.error('could not copy to clipboard', err);
          button.attr('aria-label', 'Copy failed');
        },
      );
    });

  $(block).before(button);
};

export const addCopyButtons = (): void => {
  // Denied permission or an insecure context leaves a button that can only fail, so
  // offer nothing rather than something broken.
  if (!navigator.clipboard) return;

  const blocks = new Set($('.content code').toArray().map(outermost));
  blocks.forEach(addCopyButton);
};

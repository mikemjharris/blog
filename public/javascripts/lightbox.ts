// Click a post image to see it at full size, wired up at runtime so posts stay HTML.

const CLOSE_ICON =
  '<svg class="lightbox-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path d="M6 6 18 18M18 6 6 18" />' +
  '</svg>';

let overlay: JQuery<HTMLElement> | undefined;
// The image that was clicked, so focus can go back to it on close.
let opener: HTMLElement | undefined;

const isOpen = (): boolean => overlay !== undefined && overlay.hasClass('open');

const close = (): void => {
  if (!overlay || !isOpen()) return;

  overlay.removeClass('open').attr('aria-hidden', 'true');
  $('body').removeClass('lightbox-open');
  // Drop the src so a large image is not held decoded behind the closed overlay.
  overlay.find('.lightbox-image').attr('src', '');

  opener?.focus();
  opener = undefined;
};

const buildOverlay = (): JQuery<HTMLElement> => {
  const built = $(
    '<div class="lightbox" role="dialog" aria-modal="true" aria-label="Expanded image" aria-hidden="true">' +
      '<figure class="lightbox-figure">' +
      '<img class="lightbox-image" alt="" />' +
      '<figcaption class="lightbox-caption"></figcaption>' +
      '</figure>' +
      '</div>',
  );

  const closeButton = $(
    '<button type="button" class="lightbox-close" aria-label="Close image"></button>',
  )
    .html(CLOSE_ICON)
    .on('click', close);

  built.prepend(closeButton);

  // Only the backdrop closes — a click on the image or caption is not a miss.
  built.on('click', (event) => {
    if (event.target === built[0]) close();
  });

  $('body').append(built);
  return built;
};

const open = (image: HTMLImageElement): void => {
  overlay ??= buildOverlay();
  opener = image;

  // The full-size source, not the scaled-down rendering the page is showing.
  overlay
    .find('.lightbox-image')
    .attr('src', image.currentSrc || image.src)
    .attr('alt', image.alt);

  // Captions sit in a `figure` alongside the image, so reuse one when there is one.
  const caption = $(image).closest('figure').find('figcaption').first().text().trim();
  overlay
    .find('.lightbox-caption')
    .text(caption)
    .toggle(caption !== '');

  overlay.addClass('open').attr('aria-hidden', 'false');
  // Stops the page behind scrolling while the overlay has the screen.
  $('body').addClass('lightbox-open');
  overlay.find('.lightbox-close').trigger('focus');
};

export const addImageLightbox = (): void => {
  const images = $('.content img')
    .toArray()
    // An image inside a link already has a job when clicked.
    .filter((image) => $(image).closest('a').length === 0) as HTMLImageElement[];

  if (images.length === 0) return;

  $(images)
    .addClass('lightbox-target')
    .attr({ tabindex: 0, role: 'button' })
    .on('click', function () {
      open(this as HTMLImageElement);
    })
    .on('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      // Space scrolls the page otherwise.
      event.preventDefault();
      open(this as HTMLImageElement);
    });

  $(document).on('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
};

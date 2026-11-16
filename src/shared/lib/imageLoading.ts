/**
 * Marks every <img> that finished (or failed) loading with `data-loaded`. The stylesheet
 * shows a shimmer behind lazy images that don't have the mark yet (global.css), so a poster
 * or a photo that is still on its way looks like a skeleton, not like an empty hole.
 * `load` and `error` don't bubble, hence the capture phase on the document.
 */
export function watchImageLoading(): void {
  const mark = (event: Event) => {
    if (event.target instanceof HTMLImageElement) event.target.dataset.loaded = ''
  }
  document.addEventListener('load', mark, true)
  document.addEventListener('error', mark, true)
}

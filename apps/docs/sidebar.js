function updateExplorePageAttribute() {
  if (window.location.pathname.startsWith("/explore")) {
    document.body.dataset.codexExplorePage = "true"
  } else {
    document.body.dataset.codexExplorePage = "false"
  }
}

// Set initial state
updateExplorePageAttribute()

// Listen for back/forward navigation
window.addEventListener('popstate', updateExplorePageAttribute)

// Listen for programmatic navigation (client-side routing)
// This catches navigation that doesn't trigger popstate
let currentUrl = window.location.href
const observer = new MutationObserver(() => {
  if (currentUrl !== window.location.href) {
    currentUrl = window.location.href
    updateExplorePageAttribute()
  }
})

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
})

// Also check periodically as a fallback
setInterval(() => {
  if (currentUrl !== window.location.href) {
    currentUrl = window.location.href
    updateExplorePageAttribute()
  }
}, 100)
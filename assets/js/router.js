document.addEventListener('DOMContentLoaded', () => {
    // A lightweight SPA router to eliminate page refreshes and cursor flashes
    document.addEventListener('click', async (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        
        const url = new URL(link.href);
        
        // Only intercept internal links, ignore links with target="_blank", anchors, or API calls
        if (url.origin === window.location.origin && 
            !url.pathname.startsWith('/api') && 
            !link.hasAttribute('target') &&
            !url.hash) {
            
            e.preventDefault();
            
            // Add a subtle fade out effect to the main container
            const container = document.querySelector('.border-wrapper');
            if (container) {
                container.style.transition = 'opacity 0.2s ease';
                container.style.opacity = '0.5';
            }
            
            try {
                const response = await fetch(url.href);
                const text = await response.text();
                
                const parser = new DOMParser();
                const newDoc = parser.parseFromString(text, 'text/html');
                
                // Update title
                document.title = newDoc.title;
                
                // Replace content
                const newContainer = newDoc.querySelector('.border-wrapper');
                if (container && newContainer) {
                    container.innerHTML = newContainer.innerHTML;
                    container.style.opacity = '1';
                } else {
                    // Fallback if structure is different
                    document.body.innerHTML = newDoc.body.innerHTML;
                }
                
                // Update URL
                history.pushState({}, '', url.href);
                
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'instant' });
                
                // Re-initialize interactions on the new DOM elements
                if (typeof initInteractions === 'function') {
                    initInteractions();
                }
                
            } catch (err) {
                console.error("Router error:", err);
                // Fallback to normal navigation
                window.location.href = url.href;
            }
        }
    });

    // Handle back/forward browser buttons
    window.addEventListener('popstate', async () => {
        const response = await fetch(window.location.href);
        const text = await response.text();
        
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(text, 'text/html');
        
        document.title = newDoc.title;
        
        const container = document.querySelector('.border-wrapper');
        const newContainer = newDoc.querySelector('.border-wrapper');
        
        if (container && newContainer) {
            container.innerHTML = newContainer.innerHTML;
        } else {
            document.body.innerHTML = newDoc.body.innerHTML;
        }
        
        if (typeof initInteractions === 'function') {
            initInteractions();
        }
    });
});

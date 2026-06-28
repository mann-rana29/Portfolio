/**
 * Interactions handling for Likes and Comments
 */

const API_BASE = '/api';

/**
 * Fetch and update the like count for a given page_id
 */
async function fetchLikes(pageId) {
  try {
    const res = await fetch(`${API_BASE}/likes?page_id=${pageId}`);
    if (res.ok) {
      const data = await res.json();
      updateLikeUI(pageId, data.count);
    }
  } catch (err) {
    console.error('Error fetching likes:', err);
  }
}

/**
 * Create star particles on click
 */
function createStarParticles(btn) {
  const rect = btn.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  for (let i = 0; i < 8; i++) {
    const star = document.createElement('div');
    star.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
    star.style.position = 'fixed';
    star.style.left = centerX + 'px';
    star.style.top = centerY + 'px';
    star.style.transform = 'translate(-50%, -50%)';
    star.style.pointerEvents = 'none';
    star.style.zIndex = '999';
    star.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
    document.body.appendChild(star);

    // Randomize angle and distance
    const angle = (Math.random() * Math.PI * 2);
    const distance = 40 + Math.random() * 40;
    
    // Force reflow
    star.getBoundingClientRect();

    star.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0) rotate(${Math.random() * 180}deg)`;
    star.style.opacity = '0';

    setTimeout(() => {
      star.remove();
    }, 600);
  }
}

/**
 * Toggle the like status for a given page_id (Optimistic UI)
 */
async function toggleLike(pageId) {
  const isLiked = localStorage.getItem(`liked_${pageId}`);
  const countEl = document.getElementById(`like-count-${pageId}`);
  const btn = document.getElementById(`like-btn-${pageId}`);
  let currentCount = parseInt(countEl.textContent) || 0;

  if (isLiked) {
    // Optimistic Unlike
    countEl.textContent = Math.max(0, currentCount - 1);
    btn.classList.remove('liked');
    localStorage.removeItem(`liked_${pageId}`);
    
    // Server fetch
    try {
      await fetch(`${API_BASE}/likes?page_id=${pageId}&action=unlike`, { method: 'POST' });
    } catch (e) {
      console.error('Error unliking:', e);
      // Revert if error
      countEl.textContent = currentCount;
      btn.classList.add('liked');
      localStorage.setItem(`liked_${pageId}`, 'true');
    }
  } else {
    // Optimistic Like
    countEl.textContent = currentCount + 1;
    btn.classList.add('liked');
    localStorage.setItem(`liked_${pageId}`, 'true');
    createStarParticles(btn);
    
    // Server fetch
    try {
      await fetch(`${API_BASE}/likes?page_id=${pageId}&action=like`, { method: 'POST' });
    } catch (e) {
      console.error('Error liking:', e);
      // Revert if error
      countEl.textContent = currentCount;
      btn.classList.remove('liked');
      localStorage.removeItem(`liked_${pageId}`);
    }
  }
}

/**
 * Fetch comments for a given page_id
 */
async function fetchComments(pageId) {
  try {
    const res = await fetch(`${API_BASE}/comments?page_id=${pageId}`);
    if (res.ok) {
      const data = await res.json();
      renderComments(pageId, data);
    }
  } catch (err) {
    console.error('Error fetching comments:', err);
  }
}

/**
 * Submit a new comment
 */
async function submitComment(pageId, name, content) {
  try {
    const res = await fetch(`${API_BASE}/comments?page_id=${pageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content })
    });
    
    if (res.ok) {
      // Refresh comments
      fetchComments(pageId);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error submitting comment:', err);
    return false;
  }
}

// UI Handlers

function updateLikeUI(pageId, count) {
  const countEl = document.getElementById(`like-count-${pageId}`);
  if (countEl) {
    countEl.textContent = count;
  }
}

function initLikeButton(pageId) {
  const btn = document.getElementById(`like-btn-${pageId}`);
  if (btn) {
    if (localStorage.getItem(`liked_${pageId}`)) {
      btn.classList.add('liked');
    }
  }
}

function renderComments(pageId, comments) {
  const container = document.getElementById(`comments-list-${pageId}`);
  const countEl = document.getElementById(`comments-count-${pageId}`);
  if (!container) return;

  if (countEl) countEl.textContent = `${comments.length} Comments`;

  if (!document.getElementById('comment-card-styles')) {
    document.head.insertAdjacentHTML('beforeend', `
      <style id="comment-card-styles">
        .comment-card {
          padding: 16px;
          border-radius: 0;
          border: 1px solid transparent;
          background: transparent;
          text-align: left;
          transition: all 0.2s ease;
          border-bottom: 1px solid var(--border-mid);
        }
        .comment-card:hover {
          border-color: var(--border-mid);
          background: var(--bg);
        }
        .comment-name-input:focus, .comment-text-input:focus {
          border-color: var(--text-dim) !important;
        }
      </style>
    `);
  }

  if (comments.length === 0) {
    container.innerHTML = '<div style="color: var(--text-dim); font-size: 0.95rem; padding: 16px;">No comments yet. Be the first!</div>';
    return;
  }

  container.innerHTML = comments.map(comment => {
    const date = new Date(comment.created_at).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const safeName = escapeHTML(comment.name || 'Anonymous');

    return `
      <div class="comment-card">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
          <strong style="font-weight: 600; color: var(--text); font-size: 1.1rem;">${safeName}</strong>
          <span style="color: var(--text-muted); font-size: 0.75rem; font-family: 'Fira Code', monospace;">${date}</span>
        </div>
        <div style="color: var(--text-dim); line-height: 1.5; font-size: 0.95rem; word-break: break-word;">
          ${escapeHTML(comment.content)}
        </div>
      </div>
    `;
  }).join('');
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function initInteractions() {
  // Find all elements that declare a page-id for interactions
  const interactionSections = document.querySelectorAll('.interactions-section');
  
  interactionSections.forEach(section => {
    const pageId = section.getAttribute('data-page-id');
    if (!pageId) return;

    // Load initial data
    fetchLikes(pageId);
    fetchComments(pageId);

    // Setup Like Button
    const likeBtn = document.getElementById(`like-btn-${pageId}`);
    if (likeBtn) {
      initLikeButton(pageId);
      likeBtn.addEventListener('click', () => toggleLike(pageId));
    }

    // Setup Comment Form
    const commentForm = document.getElementById(`comment-form-${pageId}`);
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = commentForm.querySelector('button[type="submit"]');
        const nameInput = commentForm.querySelector('.comment-name-input');
        const contentInput = commentForm.querySelector('.comment-text-input');
        
        const name = nameInput ? nameInput.value : '';
        const content = contentInput ? contentInput.value : '';

        if (!content.trim()) return;

        btn.disabled = true;
        btn.textContent = 'Posting...';

        const success = await submitComment(pageId, name, content);
        
        if (success) {
          if (contentInput) contentInput.value = '';
          // leave name intact if they want to comment again
        } else {
          alert('Failed to submit comment. Please try again.');
        }

        btn.disabled = false;
        btn.textContent = 'Post Comment';
      });
    }
  });
}

// Initialize immediately if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInteractions);
} else {
  initInteractions();
}

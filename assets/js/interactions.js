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
 * Increment the like count for a given page_id
 */
async function incrementLike(pageId) {
  try {
    const res = await fetch(`${API_BASE}/likes?page_id=${pageId}`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      updateLikeUI(pageId, data.count);
      // Optional: Store in localStorage to prevent multiple clicks
      localStorage.setItem(`liked_${pageId}`, 'true');
      disableLikeButton(pageId);
    }
  } catch (err) {
    console.error('Error incrementing like:', err);
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

function disableLikeButton(pageId) {
  const btn = document.getElementById(`like-btn-${pageId}`);
  if (btn) {
    btn.classList.add('liked');
    btn.disabled = true;
    // Change icon to filled
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', 'currentColor');
  }
}

function renderComments(pageId, comments) {
  const container = document.getElementById(`comments-list-${pageId}`);
  const countEl = document.getElementById(`comments-count-${pageId}`);
  if (!container) return;

  if (countEl) countEl.textContent = `${comments.length} Comments`;

  if (comments.length === 0) {
    container.innerHTML = '<div class="no-comments">No comments yet. Be the first!</div>';
    return;
  }

  container.innerHTML = comments.map(comment => {
    const date = new Date(comment.created_at).toLocaleDateString();
    return `
      <div class="comment-item">
        <div class="comment-header">
          <span class="comment-name">${escapeHTML(comment.name || 'Anonymous')}</span>
          <span class="comment-date">${date}</span>
        </div>
        <div class="comment-body">${escapeHTML(comment.content)}</div>
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

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
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
      if (localStorage.getItem(`liked_${pageId}`)) {
        disableLikeButton(pageId);
      } else {
        likeBtn.addEventListener('click', () => incrementLike(pageId));
      }
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
        btn.textContent = 'Submitting...';

        const success = await submitComment(pageId, name, content);
        
        if (success) {
          if (contentInput) contentInput.value = '';
          // leave name intact if they want to comment again
        } else {
          alert('Failed to submit comment. Please try again.');
        }

        btn.disabled = false;
        btn.textContent = 'Submit';
      });
    }
  });
});

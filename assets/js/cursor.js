if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 768) {
  document.body.classList.remove('cursor-hidden');
} else {
function initCursor() {
    const cursor = document.createElement("div");
    cursor.id = "custom-cursor";
    // Figma-like blue cursor
    cursor.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.5 3.5L18.5 11.5L12.5 13.5L9.5 21L5.5 3.5Z" fill="#1D4ED8" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
    `;
    
    document.body.appendChild(cursor);

    const style = document.createElement("style");
    style.innerHTML = `
        #custom-cursor {
            position: fixed;
            top: 0;
            left: 0;
            width: 24px;
            height: 24px;
            pointer-events: none;
            z-index: 999999;
            will-change: transform;
            transform-origin: top left;
            /* Drop shadow for depth */
            filter: drop-shadow(0px 3px 6px rgba(0, 0, 0, 0.6));
            transition: opacity 0.2s ease;
        }
        .cursor-hidden #custom-cursor {
            opacity: 0;
        }
    `;
    document.head.appendChild(style);

    const savedX = sessionStorage.getItem('cursorX');
    const savedY = sessionStorage.getItem('cursorY');
    let mouseX = savedX !== null ? parseFloat(savedX) : window.innerWidth / 2;
    let mouseY = savedY !== null ? parseFloat(savedY) : window.innerHeight / 2;

    window.addEventListener("pagehide", () => {
        sessionStorage.setItem('cursorX', mouseX);
        sessionStorage.setItem('cursorY', mouseY);
    });

    window.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        document.body.classList.remove('cursor-hidden');
    });
    
    document.addEventListener("mouseleave", () => {
        document.body.classList.add('cursor-hidden');
    });
    
    document.addEventListener("mouseenter", () => {
        document.body.classList.remove('cursor-hidden');
    });

    function animate() {
        // Direct, instant mapping for 0 delay
        cursor.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
        
        requestAnimationFrame(animate);
    }
    
    animate();

    // Interactive elements effects
    const path = cursor.querySelector('path');
    const interactiveSelector = 'a, button, input, textarea, select, [role="button"]';
    
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest(interactiveSelector)) {
            path.setAttribute('fill', '#2563EB'); // Slightly lighter blue on hover
        }
    });
    
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest(interactiveSelector)) {
            path.setAttribute('fill', '#1D4ED8');
        }
    });
    
    document.addEventListener('mousedown', (e) => {
        if (e.target.closest(interactiveSelector)) {
            path.setAttribute('fill', '#1E3A8A'); // Darkest on click
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        if (e.target.closest(interactiveSelector)) {
            path.setAttribute('fill', '#2563EB');
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCursor);
} else {
    initCursor();
}

}
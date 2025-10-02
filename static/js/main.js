/**
 * Delta-Hub Horizon Europe Website
 * Main JavaScript functionality
 */

// Global variables
let isLoading = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeWebsite();
});

/**
 * Initialize all website functionality
 */
function initializeWebsite() {
    // Initialize smooth scrolling
    initSmoothScrolling();

    // Initialize navigation
    initNavigation();

    // Initialize form handling
    initFormHandling();

    // Initialize accessibility features
    initAccessibility();

    // Initialize animations
    initAnimations();

    console.log('Delta-Hub website initialized successfully');
}

/**
 * Initialize smooth scrolling for navigation links
 */
function initSmoothScrolling() {
    // Handle anchor links with smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));

            if (target) {
                const headerHeight = document.querySelector('header').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Initialize navigation functionality
 */
function initNavigation() {
    const navbar = document.querySelector('.navbar-collapse');
    const navbarToggler = document.querySelector('.navbar-toggler');

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navbar && navbar.classList.contains('show')) {
                navbarToggler.click();
            }
        });
    });

    // Highlight active navigation item based on current page
    highlightActiveNavItem();

    // Handle scroll effects on navigation
    initScrollEffects();
}

/**
 * Highlight active navigation item
 */
function highlightActiveNavItem() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;
        if (linkPath === currentPath || (currentPath === '/' && link.textContent.trim() === 'Home')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Initialize scroll effects
 */
function initScrollEffects() {
    let lastScrollTop = 0;
    const header = document.querySelector('header');
    // Read primary RGB from CSS variables for consistent theming
    const styles = getComputedStyle(document.documentElement);
    const primaryRgb = styles.getPropertyValue('--eu-primary-rgb').trim() || '31, 111, 84';

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Add shadow to header when scrolling
        if (scrollTop > 10) {
            header.style.boxShadow = `0 2px 20px rgba(${primaryRgb}, 0.15)`;
        } else {
            header.style.boxShadow = `0 2px 10px rgba(${primaryRgb}, 0.1)`;
        }

        lastScrollTop = scrollTop;
    });
}

/**
 * Initialize form handling
 */
function initFormHandling() {
    // Contact form handling (skip forms that opt out)
    const contactForms = document.querySelectorAll('#contactForm, form[method="POST"]');
    contactForms.forEach(form => {
        if (form.dataset && form.dataset.skipGlobalHandler === 'true') return;
        form.addEventListener('submit', handleContactForm);
    });

    // Newsletter subscription handling
    const newsletterButtons = document.querySelectorAll('button[type="button"]');
    newsletterButtons.forEach(button => {
        if (button.textContent.includes('Subscribe')) {
            button.addEventListener('click', handleNewsletterSubscription);
        }
    });
}

/**
 * Handle contact form submission
 */
function handleContactForm(event) {
    const form = event.target;
    const formData = new FormData(form);

    // Basic form validation
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');

    if (!name || !email || !message) {
        event.preventDefault();
        showMessage('Please fill in all required fields.', 'error');
        return false;
    }

    // Email validation
    if (!isValidEmail(email)) {
        event.preventDefault();
        showMessage('Please enter a valid email address.', 'error');
        return false;
    }

    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
    }

    return true;
}

/**
 * Handle newsletter subscription
 */
function handleNewsletterSubscription(event) {
    const button = event.target;
    const input = button.closest('.input-group').querySelector('input[type="email"]');
    const email = input.value.trim();

    if (!email) {
        showMessage('Please enter your email address.', 'error');
        input.focus();
        return;
    }

    if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address.', 'error');
        input.focus();
        return;
    }

    // Simulate subscription process
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Subscribing...';

    setTimeout(() => {
        button.innerHTML = '<i class="fas fa-check me-1"></i>Subscribed!';
        button.classList.remove('btn-light');
        button.classList.add('btn-success');
        input.value = '';
        showMessage('Thank you for subscribing to our newsletter!', 'success');

        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-bell me-1"></i>Subscribe';
            button.classList.remove('btn-success');
            button.classList.add('btn-light');
        }, 3000);
    }, 1500);
}

/**
 * Validate email address
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Show user messages
 */
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.alert.auto-dismiss');
    existingMessages.forEach(msg => msg.remove());

    // Create new message
    const alertClass = type === 'error' ? 'alert-danger' :
        type === 'success' ? 'alert-success' :
            'alert-info';

    const messageEl = document.createElement('div');
    messageEl.className = `alert ${alertClass} alert-dismissible fade show auto-dismiss`;
    messageEl.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Insert message at the top of the main content
    const main = document.querySelector('main');
    if (main) {
        main.insertBefore(messageEl, main.firstChild);
    }

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.remove();
        }
    }, 5000);
}

/**
 * Initialize accessibility features
 */
function initAccessibility() {
    // Skip to main content link
    addSkipLink();

    // Keyboard navigation for cards
    initKeyboardNavigation();

    // ARIA labels for interactive elements
    addAriaLabels();

    // Focus management
    initFocusManagement();
}

/**
 * Add skip to main content link
 */
function addSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'sr-only sr-only-focusable btn btn-primary position-fixed';
    skipLink.style.top = '10px';
    skipLink.style.left = '10px';
    skipLink.style.zIndex = '9999';

    skipLink.addEventListener('focus', function () {
        this.classList.remove('sr-only');
    });

    skipLink.addEventListener('blur', function () {
        this.classList.add('sr-only');
    });

    document.body.insertBefore(skipLink, document.body.firstChild);

    // Add main content ID if it doesn't exist
    const main = document.querySelector('main');
    if (main && !main.id) {
        main.id = 'main-content';
        main.tabIndex = -1;
    }
}

/**
 * Initialize keyboard navigation for interactive cards
 */
function initKeyboardNavigation() {
    const cards = document.querySelectorAll('.hover-card');

    cards.forEach(card => {
        // Make cards focusable
        if (!card.tabIndex) {
            card.tabIndex = 0;
        }

        // Add keyboard event listeners
        card.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();

                // Find the first link in the card and click it
                const link = this.querySelector('a');
                if (link) {
                    link.click();
                }
            }
        });
    });
}

/**
 * Add ARIA labels to interactive elements
 */
function addAriaLabels() {
    // Social media links
    const socialLinks = document.querySelectorAll('a[href="#"]');
    socialLinks.forEach(link => {
        const icon = link.querySelector('i');
        if (icon && icon.classList.contains('fab')) {
            if (icon.classList.contains('fa-linkedin')) {
                link.setAttribute('aria-label', 'Follow us on LinkedIn');
            } else if (icon.classList.contains('fa-x-twitter')) {
                link.setAttribute('aria-label', 'Follow us on Twitter/X');
            }
        }
    });

    // Form buttons
    const buttons = document.querySelectorAll('button[type="submit"]');
    buttons.forEach(button => {
        if (!button.getAttribute('aria-label')) {
            button.setAttribute('aria-label', `Submit ${button.textContent.trim()}`);
        }
    });
}

/**
 * Initialize focus management
 */
function initFocusManagement() {
    // Trap focus in modals
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Tab') {
            const modal = document.querySelector('.modal.show');
            if (modal) {
                trapFocus(event, modal);
            }
        }
    });
}

/**
 * Trap focus within an element
 */
function trapFocus(event, element) {
    const focusableElements = element.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );

    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
        if (document.activeElement === firstFocusableElement) {
            lastFocusableElement.focus();
            event.preventDefault();
        }
    } else {
        if (document.activeElement === lastFocusableElement) {
            firstFocusableElement.focus();
            event.preventDefault();
        }
    }
}

/**
 * Initialize animations
 */
function initAnimations() {
    // Scroll reveal animations
    initScrollRevealAnimations();

    // Parallax effects
    initParallaxEffects();

    // Lazy loading for images and videos
    initLazyLoading();

    // Add floating animation to icons
    initFloatingIcons();
}

/**
 * Initialize scroll reveal animations
 */
function initScrollRevealAnimations() {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Add scroll-reveal classes to elements
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        // Alternate between left and right animations
        if (index % 2 === 0) {
            card.classList.add('scroll-reveal-left');
        } else {
            card.classList.add('scroll-reveal-right');
        }
        observer.observe(card);
    });

    // Section titles with fade-up
    const sectionTitles = document.querySelectorAll('.section-title, h2, h3');
    sectionTitles.forEach(title => {
        title.classList.add('scroll-reveal');
        observer.observe(title);
    });
}

/**
 * Initialize parallax scrolling effects
 */
function initParallaxEffects() {
    // Disable parallax for hero video to prevent positioning issues
    // Only apply to elements explicitly marked with .parallax class
    const parallaxElements = document.querySelectorAll('.parallax:not(.hero-video)');

    if (parallaxElements.length === 0) return;

    const handleParallax = debounce(() => {
        const scrolled = window.pageYOffset;

        parallaxElements.forEach(element => {
            const speed = element.dataset.parallaxSpeed || 0.5;
            const yPos = -(scrolled * speed);
            element.style.transform = `translate3d(0, ${yPos}px, 0)`;
        });
    }, 10);

    window.addEventListener('scroll', handleParallax);
}

/**
 * Initialize lazy loading for images and videos
 */
function initLazyLoading() {
    // Lazy load images
    const lazyImages = document.querySelectorAll('img[data-src]');
    const lazyVideos = document.querySelectorAll('video[data-src]');

    const lazyLoadOptions = {
        threshold: 0,
        rootMargin: '50px'
    };

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('fade-in');
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    }, lazyLoadOptions);

    const videoObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const video = entry.target;
                video.src = video.dataset.src;
                video.load();
                video.classList.add('fade-in');
                video.removeAttribute('data-src');
                observer.unobserve(video);
            }
        });
    }, lazyLoadOptions);

    lazyImages.forEach(img => imageObserver.observe(img));
    lazyVideos.forEach(video => videoObserver.observe(video));
}

/**
 * Initialize floating animation for icons
 */
function initFloatingIcons() {
    const icons = document.querySelectorAll('.card-body i.fa-3x, .hover-card i.fa-3x');
    icons.forEach((icon, index) => {
        icon.classList.add('float-animation');
        // Stagger the animation delay
        icon.style.animationDelay = `${index * 0.2}s`;
    });
}

/**
 * Utility function to format dates
 */
function formatDate(dateString) {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Utility function to debounce function calls
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * Handle responsive image loading
 */
function initResponsiveImages() {
    const images = document.querySelectorAll('img[data-src]');

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy-load');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        images.forEach(img => {
            img.src = img.dataset.src;
            img.classList.remove('lazy-load');
        });
    }
}

/**
 * Error handling
 */
window.addEventListener('error', function (event) {
    console.error('Website error:', event.error);

    // Show user-friendly error message for critical errors
    if (event.error && event.error.message && event.error.message.includes('fetch')) {
        showMessage('Connection error. Please check your internet connection and try again.', 'error');
    }
});

/**
 * Handle offline/online status
 */
window.addEventListener('offline', function () {
    showMessage('You are currently offline. Some features may not be available.', 'warning');
});

window.addEventListener('online', function () {
    showMessage('Connection restored.', 'success');
});

// Export functions for use in other scripts
window.DeltaHub = {
    showMessage,
    formatDate,
    isValidEmail,
    debounce
};

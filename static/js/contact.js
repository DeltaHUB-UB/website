/**
 * Contact Form Handler for Formspree Integration
 */

document.addEventListener('DOMContentLoaded', function () {
    initializeContactForm();
    checkForSuccessMessage();
});

/**
 * Initialize contact form functionality
 */
function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactFormSubmission);
    }

    // Newsletter subscription
    const subscribeBtn = document.getElementById('subscribeBtn');
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', handleNewsletterSubscription);
    }
}

/**
 * Check for success message from Formspree redirect
 */
function checkForSuccessMessage() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === '1') {
        showMessage('Thank you for your message! We have received your inquiry and will respond within 2-3 business days.', 'success');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/**
 * Handle contact form submission
 */
async function handleContactFormSubmission(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const name = formData.get('name')?.trim();
    const email = formData.get('email')?.trim();
    const subject = formData.get('subject');
    const message = formData.get('message')?.trim();
    const subscribe = formData.get('subscribe');

    // Validation
    if (!name || !email || !message) {
        showMessage('Please fill in all required fields.', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address.', 'error');
        return;
    }

    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';

    try {
        // Submit to Formspree
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            showMessage('Thank you for your message! We will get back to you soon.', 'success');
            form.reset();
        } else {
            const data = await response.json();
            if (data.errors) {
                showMessage(data.errors.map(error => error.message).join(', '), 'error');
            } else {
                showMessage('There was a problem sending your message. Please try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('There was a problem sending your message. Please try again.', 'error');
    } finally {
        // Restore button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}



/**
 * Handle newsletter subscription
 */
function handleNewsletterSubscription(event) {
    const email = document.getElementById('subscriptionEmail')?.value.trim();

    if (!email) {
        showMessage('Please enter your email address.', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address.', 'error');
        return;
    }

    const button = event.target;
    const originalText = button.innerHTML;

    // Show loading state
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Subscribing...';

    // Simulate subscription process
    setTimeout(() => {
        // In a real implementation, you might use:
        // - Mailchimp API
        // - ConvertKit
        // - EmailJS
        // - A serverless function

        button.innerHTML = '<i class="fas fa-check me-1"></i>Subscribed!';
        button.classList.remove('btn-light');
        button.classList.add('btn-success');

        document.getElementById('subscriptionEmail').value = '';
        showMessage('Thank you for subscribing to our newsletter!', 'success');

        // Log for development
        console.log('Newsletter subscription:', email);

        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = originalText;
            button.classList.remove('btn-success');
            button.classList.add('btn-light');
        }, 3000);
    }, 1000);
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
    // Use the global showMessage function if available
    if (window.DeltaHub?.showMessage) {
        window.DeltaHub.showMessage(message, type);
        return;
    }

    // Fallback implementation
    const container = document.getElementById('flashMessages');
    if (!container) {
        alert(message);
        return;
    }

    const alertClass = type === 'error' ? 'alert-danger' :
        type === 'success' ? 'alert-success' :
            'alert-info';

    const messageEl = document.createElement('div');
    messageEl.className = `alert ${alertClass} alert-dismissible fade show`;
    messageEl.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    container.innerHTML = '';
    container.appendChild(messageEl);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.remove();
        }
    }, 5000);
}
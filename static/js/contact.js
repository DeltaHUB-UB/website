/**
 * Contact Form Handler for Static Site
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeContactForm();
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
 * Handle contact form submission
 */
function handleContactFormSubmission(event) {
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
    
    // Simulate form processing
    setTimeout(() => {
        // In a real static site, you might:
        // 1. Use a service like Formspree, Netlify Forms, or EmailJS
        // 2. Send to a serverless function
        // 3. Use mailto: link
        
        // For now, create a mailto link
        const mailtoLink = createMailtoLink(name, email, subject, message);
        
        // Try to open email client
        const link = document.createElement('a');
        link.href = mailtoLink;
        link.click();
        
        // Show success message
        showMessage('Thank you for your message! Your email client should open with the pre-filled message.', 'success');
        
        // Reset form
        form.reset();
        
        // Log to console for development
        console.log('Contact form submission:', {
            name, email, subject, message, subscribe
        });
        
        // Restore button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }, 1000);
}

/**
 * Create mailto link
 */
function createMailtoLink(name, email, subject, message) {
    const to = 'info@delta-hub.eu';
    const subjectLine = subject ? `${subject} - Contact from ${name}` : `Contact from ${name}`;
    const body = `From: ${name} <${email}>\n\nMessage:\n${message}`;
    
    return `mailto:${to}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
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
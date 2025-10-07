// Emergency Alert Box Button Animations
document.querySelectorAll('.alert-btn[id*="monitor"]').forEach(monitorBtn => {
    monitorBtn.addEventListener('click', function() {
        const alertCard = this.closest('.alert-card');
        alertCard.classList.add('monitoring');
        
        // Show the stop button with animation
        const stopBtn = alertCard.querySelector('.alert-btn[id*="stop"]');
        stopBtn.style.display = 'flex';
        
        // Start monitoring animation/functionality here
        // ...
    });
});

document.querySelectorAll('.alert-btn[id*="stop"]').forEach(stopBtn => {
    stopBtn.addEventListener('click', function() {
        const alertCard = this.closest('.alert-card');
        alertCard.classList.remove('monitoring');
        
        // Stop monitoring animation/functionality here
        // ...
    });
});
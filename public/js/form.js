document.getElementById('emailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('emailInput').value;
    
    try {
        const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Thank you for subscribing!');
            document.getElementById('emailForm').reset();
        } else {
            console.error('Server error:', data);
            alert(`Error: ${data.error || 'Something went wrong'}`);
        }
    } catch (error) {
        console.error('Client error:', error);
        alert('Connection error. Please try again.');
    }
});
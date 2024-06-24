const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests allowed' });
    }

    const { group, date, number } = req.body;

    // Send notification using Pushover
    const pushoverUserKey = 'ur3mjnnphkzuhrmv7o8b48okun95ug'; // Replace with your Pushover user key
    const pushoverApiToken = 'a4o71xc3h311fpswi1ekv85hy8kk53'; // Replace with your Pushover API token

    const message = `Group: ${group}\nDate: ${date}\nNumber: ${number}`;

    try {
        const response = await fetch('https://api.pushover.net/1/messages.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                token: pushoverApiToken,
                user: pushoverUserKey,
                message: message,
                title: 'Meeting Information'
            })
        });

        const data = await response.json();

        if (data.status !== 1) {
            throw new Error('Failed to send notification');
        }

        // Save data to a simple JSON store (in-memory or file-based)
        // Note: For production use, consider using a proper database
        // Here, we are simply logging it for demonstration
        console.log({ group, date, number });

        return res.status(200).json({ message: 'Form submitted and notification sent successfully' });
    } catch (error) {
        console.error('Error sending notification:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

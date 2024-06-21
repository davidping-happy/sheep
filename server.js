const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
const port = 3000;

// Replace with your Twilio account SID and auth token
const accountSid = 'AC07eac0fdb3c25d07e8212f2732f8fe8d';
const authToken = 'dba7f2a7425750e76ac1af73e52e2ff1';
const client = twilio(accountSid, authToken);

app.use(bodyParser.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }
    next();
});

app.post('/send-sms', (req, res) => {
    const { group, date, number } = req.body;

    client.messages.create({
        body: `Group: ${group}, Date: ${date}, Participants: ${number}`,
        from: '+14322266720', // Twilio phone number
        to: '+886920310136'      // Your phone number
    }).then(message => {
        res.status(200).send(`SMS sent: ${message.sid}`);
    }).catch(error => {
        console.error('Error sending SMS:', error);
        res.status(500).send(`Error sending SMS: ${error.message}`);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

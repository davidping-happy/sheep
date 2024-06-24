// Your web app's Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyCVwM3-Rp-lHO1oGRnWtaY0BHaFycwBZfg",
    authDomain: "weeklyreport-959d9.firebaseapp.com",
    databaseURL: "https://weeklyreport-959d9-default-rtdb.firebaseio.com",
    projectId: "weeklyreport-959d9",
    storageBucket: "weeklyreport-959d9.appspot.com",
    messagingSenderId: "86156094842",
    appId: "1:86156094842:web:7c53aaff90ccbd2ed73ac3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

var database = firebase.database();

document.getElementById('meetingForm').addEventListener('submit', submitForm);

function submitForm(e) {
    e.preventDefault();
    
    var group = document.getElementById('group').value;
    var date = document.getElementById('date').value;
    var number = document.getElementById('number').value;

    saveMeeting(group, date, number);
    
    // Show confirmation message
    document.getElementById('confirmationMessage').style.display = 'block';
    
    // Hide confirmation message after 3 seconds
    setTimeout(function() {
        document.getElementById('confirmationMessage').style.display = 'none';
    }, 3000);
    
    // Clear form
    document.getElementById('meetingForm').reset();

    // Send notification via IFTTT
    sendNotification(group, date, number);
}

function saveMeeting(group, date, number) {
    var newMeetingRef = database.ref('meetings').push();
    newMeetingRef.set({
        group: group,
        date: date,
        number: number
    });
}

function sendNotification(group, date, number) {
    var iftttKey = 'cFlz_mW1pqFUQ35hSSnTDlD_KTdIoIgzwxx0KkL4VlH'; // Replace with your IFTTT Webhooks key
    var eventName = 'send_sms'; // Replace with your IFTTT event name

    fetch(`https://maker.ifttt.com/trigger/${eventName}/with/key/${iftttKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            value1: group,
            value2: date,
            value3: number
        })
    }).then(response => {
        if (response.ok) {
            console.log('Notification sent successfully');
        } else {
            console.error('Failed to send notification');
        }
    }).catch(error => {
        console.error('Error sending notification:', error);
    });
}

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
const messaging = firebase.messaging();

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

    // Send push notification
    sendPushNotification(group, date, number);
}

function saveMeeting(group, date, number) {
    var newMeetingRef = database.ref('meetings').push();
    newMeetingRef.set({
        group: group,
        date: date,
        number: number
    });
}

function sendPushNotification(group, date, number) {
    const payload = {
        notification: {
            title: 'New Meeting Submitted',
            body: `Group: ${group}, Date: ${date}, Participants: ${number}`,
            click_action: 'https://your-website.com'
        }
    };

    messaging.getToken({ vapidKey: 'YOUR_PUBLIC_VAPID_KEY' }).then((token) => {
        fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${firebaseConfig.messagingSenderId}`
            },
            body: JSON.stringify({
                to: token,
                notification: payload.notification
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
    }).catch((err) => {
        console.error('Error retrieving FCM token:', err);
    });
}

// Request permission for notifications
messaging.requestPermission()
    .then(() => {
        console.log('Notification permission granted.');
        return messaging.getToken({ vapidKey: 'YOUR_PUBLIC_VAPID_KEY' });
    })
    .then((token) => {
        console.log('FCM Token:', token);
    })
    .catch((err) => {
        console.error('Unable to get permission to notify.', err);
    });

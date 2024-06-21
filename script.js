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
}

function saveMeeting(group, date, number) {
    var newMeetingRef = database.ref('meetings').push();
    newMeetingRef.set({
        group: group,
        date: date,
        number: number
    });
}

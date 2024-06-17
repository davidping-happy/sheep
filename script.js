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

// Reference to the database service
var database = firebase.database();

document.getElementById('meetingForm').addEventListener('submit', submitForm);

function submitForm(e) {
    e.preventDefault();

    // Get values
    var group = getInputVal('group');
    var date = getInputVal('date');
    var number = getInputVal('number');

    // Save meeting data
    saveMeeting(group, date, number);

    // Clear form
    document.getElementById('meetingForm').reset();
}

// Function to get form values
function getInputVal(id) {
    return document.getElementById(id).value;
}

// Save meeting data to firebase
function saveMeeting(group, date, number) {
    var newMeetingRef = database.ref('meetings').push();
    newMeetingRef.set({
        group: group,
        date: date,
        number: number
    });
}

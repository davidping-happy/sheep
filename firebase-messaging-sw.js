importScripts('https://www.gstatic.com/firebasejs/8.6.8/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.6.8/firebase-messaging.js');

firebase.initializeApp({
    apiKey: "AIzaSyCVwM3-Rp-lHO1oGRnWtaY0BHaFycwBZfg",
    authDomain: "weeklyreport-959d9.firebaseapp.com",
    databaseURL: "https://weeklyreport-959d9-default-rtdb.firebaseio.com",
    projectId: "weeklyreport-959d9",
    storageBucket: "weeklyreport-959d9.appspot.com",
    messagingSenderId: "86156094842",
    appId: "1:86156094842:web:7c53aaff90ccbd2ed73ac3"
});

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = 'Background Message Title';
    const notificationOptions = {
        body: 'Background Message body.',
        icon: '/firebase-logo.png'
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

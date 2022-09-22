$(function() {
    // This is the host for the backend.
    // TODO: When running Firenotes locally, set to http://localhost:8081. Before
    // deploying the application to a live production environment, change to
    // https://backend-dot-<PROJECT_ID>.appspot.com as specified in the
    // backend's app.yaml file.
    var backendHostUrl = 'http://localhost:8081';

    // [START gae_python_firenotes_config]
    // Obtain the following from the "Add Firebase to your web app" dialogue
    // Initialize Firebase
    var config = {
        apiKey: "AIzaSyDUZV4B0VWFHQvRdm0EVBlllRxBsWBK_tc",
        authDomain: "fans2019.firebaseapp.com",
        databaseURL: "https://fans2019.firebaseio.com",
        projectId: "fans2019",
        storageBucket: "fans2019.appspot.com",
        messagingSenderId: "767844996933",
        appId: "1:767844996933:web:895f352658946a5d"
    };
    // [END gae_python_firenotes_config]

    var uid = null;
    firebase.initializeApp(config);
    var db = firebase.firestore();

    // Firebase log-in
    function configureFirebaseLogin() {

        storage = firebase.storage().ref();

        // [START gae_python_state_change]
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                var name = user.displayName;

                uid = user.uid;

                user.getIdToken().then(function(idToken) {
                    $('#user').text(user.displayName);
                    var profile_link = '/user/' + uid;
                    $('#profile-link').attr('href', profile_link);
                    $('#user-nav').show();
                });
            } else {
                $('#user-nav').hide();
            }
        });
        // [END gae_python_state_change]
    }

    // Sign out a user
    $('#sign-out').click(function() {
        firebase.auth().signOut().then(function() {
            console.log("Sign out successful");
            window.location.href = '/';
            return true;
        }, function(error) {
            console.log(error);
        });
    });

    $('.subscribe-button').click(function() {
        var $this = $(this);
        var subscribe_to = this.id.replace('-subscribe-button', '');
        if (subscribe_to !== uid) {
            $.ajax({
                url: backendHostUrl + '/subscribe',
                type: 'POST',
                data: {
                    'uid': uid,
                    'subscribe_to': subscribe_to
                },
                success: function(response) {
                    console.log(response);
                    $this.html('Subscribed <span class="badge badge-light">&#10004;</span>');
                }
            });
        }
    });

    window.addEventListener('load', function() {
        configureFirebaseLogin();

        $('#discover-nav').addClass('active');
    });
});
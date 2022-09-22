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

    var fileExtension = ['png', 'jpg', 'jpeg', 'gif'];

    // This is passed into the backend to authenticate the user.
    var uid = null;
    firebase.initializeApp(config);
    var db = firebase.firestore();
    var storage = null;

    // Firebase log-in
    function configureFirebaseLogin() {

        storage = firebase.storage().ref();

        // [START gae_python_state_change]
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                $('#logged-out').hide();
                $('#wrapper').removeClass('h-100');

                uid = user.uid;

                user.getIdToken().then(function(idToken) {
                    $('#user').text(user.displayName);
                    $('#user_id').text(uid);
                    var profile_link = '/user/' + uid;
                    $('#profile-link').attr('href', profile_link);
                    $('#user-nav').show();
                    $('#logged-in').show();

                    setSettingsFields();
                });
            } else {
                console.log('here!');
                window.location.href = '/';
            }
        });
        // [END gae_python_state_change]
    }

    function setSettingsFields() {
        $.ajax({
            url: backendHostUrl + '/get_user',
            type: 'GET',
            data: {
                'uid': uid
            },
            success: function(response) {
                setProfileData(JSON.parse(response));
            }
        });
    }

    function setProfileData(data) {
        try {
            $('#display_name').attr('placeholder', data['display_name']);
        } catch (err) {
            console.log(err);
        }
        try {
            $('#bio').attr('placeholder', data['bio']);
        } catch (err) {
            console.log(err);
        }
        try {
            $('#price').attr('placeholder', data['price']);
        } catch (err) {
            console.log(err);
        }
    }

    $('#settingsForm').submit(function(event) {
        event.preventDefault();

        var formData = new FormData();

        var display_name = $('#display_name').val().trim();
        if (display_name && display_name !== '') {
            formData.append('display_name', display_name);
        }

        var display_image = $('#display_image').get(0).files[0];
        if (display_image) {
            formData.append('display_image', display_image);
        }

        var banner_image = $('#banner_image').get(0).files[0];
        if (banner_image) {
            formData.append('banner_image', banner_image);
        }

        var bio = $('#bio').val().trim();
        if (bio) {
            formData.append('bio', bio);
        }

        var price = $('#price').val();
        if (price && price >= 5.00) {
            formData.append('price', price);
        }

        formData.append('uid', uid);

        $.ajax({
            url: backendHostUrl + '/update_user',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                console.log(response);
                window.location.href = '';
            },
        });

        return true;
    });

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

    $("#display_image").change(function() {
        if (!isValidFileExtension($(this))) {
            $(this).val('');
            displayInvalidExtensionAlert();
        }

        var size = 1; //MB
        if (!isWithinSizeLimit(this.files[0], size)) {
            displayOverSizeLimitAlert(size);
            $(this).val('');
        }
    });

    $("#banner_image").change(function() {
        if (!isValidFileExtension($(this))) {
            $(this).val('');
            displayInvalidExtensionAlert();
        }

        var size = 10; //MB
        if (!isWithinSizeLimit(this.files[0], size)) {
            displayOverSizeLimitAlert(size);
            $(this).val('');
        }
    });

    function displayInvalidExtensionAlert() {
        alert("Ensure the file format is one of the following: " + fileExtension.join(', '));
    }

    function isValidFileExtension(file) {
        return !($.inArray(file.val().split('.').pop().toLowerCase(), fileExtension) == -1);
    }

    function isWithinSizeLimit(file, size) {
        return (file.size / 1024 / 1024) < size;
    }

    function displayOverSizeLimitAlert(size) {
        alert("File must be less than " + size + "MB");
    }

    window.addEventListener('load', function() {
        configureFirebaseLogin();
    });
})
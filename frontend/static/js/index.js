// Copyright 2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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

    var fileExtension = ['png', 'jpg', 'jpeg', 'gif', 'mp4', 'mov'];

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
                    var profile_link = '/user/' + uid;
                    $('#profile-link').attr('href', profile_link);
                    $('#user-nav').show();
                    $('#logged-in').show();

                    getPosts(uid);
                });
            } else {
                $('#wrapper').addClass('h-100');
                $('#user-nav').hide();
                $('#logged-in').hide();
                $('#logged-out').show();
            }
        });
        // [END gae_python_state_change]
    }

    function getPosts(uid) {
        $.ajax({
            url: backendHostUrl + '/get_posts',
            type: 'GET',
            data: {
                'uid': uid,
                'current_uid': uid,
                'subscriptions_posts': true
            },
            success: function(response) {
                displayPosts(JSON.parse(response));
            }
        });
    }

    function displayPosts(posts) {
        var posts_length = Object.keys(posts).length;
        if (posts_length > 0) {
            file_promises = [];
            for (var key in posts) {
                var post = posts[key];
                var post_id = post['post_id']

                getPostHtml(post_id, post);
            }
        } else {
            $('#feed').append("<p>Nothing's here! Subscribe to some users or upload some content using the form at the top to see stuff here!</p>");
        }
    }

    function setFileSrc(file_id) {
        return function(url) {
            var file = document.getElementById(file_id);
            file.src = url;
        }
    }

    function constructCloudStorageFilePath(author_id, folder, file_name) {
        return author_id + '/' + folder + '/' + file_name;
    }

    function getFirebaseUrlForFile(file_name) {
        var pathReference = storage.child(file_name);
        return pathReference.getDownloadURL();
    }

    function getPostHtml(post_id, post, files) {
        var author_id = post['author_id'];
        var files = post['files'];

        html = '<div class="post mb-5 pb-5">';

        // post header
        html += '<div class="post_header d-flex pt-2 justify-content-between align-items-center mb-2">';

        var file_promises = [];

        // display info
        var display_info = post['display_info'];
        // user info
        var profile_array = getProfileInfoHtml(post_id, author_id, display_info['image'], display_info['name']);
        var profile_html = profile_array[0];
        html += profile_html;
        file_promises.push(...profile_array[1]);

        // posted time
        formatted_datetime = moment.unix(post['release_datetime']).format("DD MMMM YY HH:mm");
        html += '<p>Posted: ' + formatted_datetime + '</p>';
        // close post header
        html += '</div>';

        if (files && files.length > 0) {
            var files_array = getFilesHtml(files, post_id, author_id);
            var files_html = files_array[0];
            html += files_html;
            file_promises.push(...files_array[1]);
        }

        // post footer
        html += '<div class="post_footer d-flex pt-2 justify-content-between">';

        // likes
        html += getLikesHtml(post['already_liked'], post['total_likes'], author_id, post_id);

        // caption
        html += '<div class="caption align-self-center p-3">';
        caption = post['caption'];
        if (caption) {
            html += caption;
        } else {
            html += '';
        }
        html += '</div>';

        // post settings (delete etc)
        // (still add the div to ensure the caption and likes are in the right
        // place)
        html += '<div align-self-center>';
        if (uid === author_id) {
            html += '<form class="delete-form" action="" enctype="multipart/form-data" action="/delete">' +
                // used to pass the post id back to python for deletion
                '<input type="hidden" name="post_id" value="' + post_id + '" />' +
                '<input class="btn btn-outline-dark" type="submit" name="Delete" value="Delete" />' +
                '</form>' +
                '</div>';
        }
        // close "post_footer" div
        html += '</div';

        // close "post" div
        html += '</div>';

        $('#feed').append(html);

        if (file_promises && file_promises.length > 0) {
            file_promises.forEach(function(file_promise) {
                html_id = file_promise['file_id'];
                file_promise['promise'].then(setFileSrc(html_id), html_id);
            });
        }
    }

    function getProfileInfoHtml(post_id, author_id, file_name, display_name) {
        // user info
        var html = '<div class="row align-items-center">';

        // profile image
        html += '<div class="col">';
        var file_id = post_id + '-img';
        html += '<img id="' + file_id + '" class="profile-img rounded-circle" src="/static/img/profile.svg" />';
        html += '</div>';

        file_path = constructCloudStorageFilePath(author_id,
            'images',
            file_name
        );
        var promise = getFirebaseUrlForFile(file_path);

        var file_promises = [];
        file_promises.push({
            'file_id': file_id,
            'promise': promise
        });

        html += '<div id="display-name" class="col">';
        html += '<h4>' + display_name + '</h4>';
        html += '</div>';
        html += '</div>';
        // end user info div
        return [html, file_promises];
    }

    function getFilesHtml(files, post_id, author_id) {
        var html = '';

        var file_promises = null;
        if (files && files.length > 1) {
            var carousel_html = getCarouselHtml(files, post_id, author_id);
            html = carousel_html[0];
            file_promises = carousel_html[1];
        } else if (files.length == 1) {
            var file = files[0];
            var content_type = file['content_type'];
            var file_name = file['file_name'];
            var file_html = getFileHtml(content_type, author_id, post_id, file_name);
            html = file_html[0];
            file_promises = file_html[1];
        }

        return [html, file_promises];
    }

    function getCarouselHtml(files, post_id, author_id) {
        var carousel_id = 'carousel' + post_id;
        // start new carousel
        var html = '<div id="' + carousel_id + '" class="carousel slide" data-ride="carousel" data-interval="false">' +
            '<div class="carousel-inner">';

        var file_promises = [];
        files.forEach(function(file, i) {
            // add a new carousel item
            if (i === 0) {
                html += '<div class="carousel-item active">';
            } else {
                html += '<div class="carousel-item">';
            }

            var file_name = file['file_name'];
            var content_type = file['content_type'];

            file_path = constructCloudStorageFilePath(author_id,
                post_id,
                file_name
            );

            // use to locate the post and set it's source url
            var file_id = file_name + '-file';

            var promise = getFirebaseUrlForFile(file_path);

            file_promises.push({
                'file_id': file_id,
                'promise': promise
            });

            if (content_type.startsWith('image')) {
                html += '<img class="d-block w-100 img-fluid" id="' + file_id + '" src="" />';
            } else if (content_type.startsWith('video')) {
                html += '<video class="d-block w-100 img-fluid" controls>' +
                    '<source id="' + file_id + '" src="" type="' + content_type + '" />' +
                    'Please upgrade to a browser that supports HTML5' +
                    '</video>';
            };

            // close carousel item
            html += '</div>';
        });

        // close carousel
        html += '</div>' +
            '<a class="carousel-control-prev" href="#' + carousel_id + '" role="button" data-slide="prev">' +
            '<span class="carousel-control-prev-icon" aria-hidden="true"></span>' +
            '<span class="sr-only">Previous</span>' +
            '</a>' +
            '<a class="carousel-control-next" href="#' + carousel_id + '" role="button" data-slide="next">' +
            '<span class="carousel-control-next-icon" aria-hidden="true"></span>' +
            '<span class="sr-only">Next</span>' +
            '</a>' +
            '</div>';

        return [html, file_promises];
    }

    function getFileHtml(content_type, author_id, post_id, file_name) {
        var file_id = file_name + '-file';
        var html = '';
        if (content_type.startsWith('image')) {
            html = '<img class="d-block w-100 img-fluid" id="' + file_id + '" src="" />';
        } else if (content_type.startsWith('video')) {
            html = '<video class="d-block w-100 img-fluid" controls>' +
                '<source id="' + file_id + '" src="" type="' + content_type + '" />' +
                'Please upgrade to a browser that supports HTML5' +
                '</video>';
        };

        file_path = constructCloudStorageFilePath(author_id,
            post_id,
            file_name
        );

        var promise = getFirebaseUrlForFile(file_path);

        var file_promises = [];
        file_promises.push({
            'file_id': file_id,
            'promise': promise
        });

        return [html, file_promises];
    }

    function getLikesHtml(already_liked, total_likes, author_id, post_id) {
        var html = '<div class="likes align-self-center">';
        html += '<button id="' + author_id + '-' + post_id + '-like" class="like-button">';
        html += '<span><img src="';
        if (already_liked) {
            html += '/static/img/heart.svg';
        } else {
            html += '/static/img/heart-outline.svg';
        }
        // close img span
        html += '" alt="Likes" /></span>';
        html += '<span>';
        if (total_likes) {
            html += total_likes;
        } else {
            html += '0';
        }
        html += '</span>';
        // close button
        html += '</button>';
        // close likes div
        html += '</div>';
        return html;
    }

    $(document).on('click', '.like-button', function() {
        var id_parts = this.id.split('-');
        var author_id = id_parts[0];
        var post_id = id_parts[1];
        var count_span = $(this).find('span')[1];
        var counter = parseInt(count_span.innerText);

        // don't like your own posts!
        if (author_id !== uid) {
            var img = $(this).find('span img')[0];

            $.ajax({
                url: backendHostUrl + '/like_unlike_post',
                type: 'POST',
                data: {
                    'uid': uid,
                    'post_id': post_id
                },
                success: function(response) {
                    console.log(response);
                    if (response === 'Liked') {
                        count_span.innerText = counter + 1;
                        img.src = '/static/img/heart.svg';
                    } else if (response === 'Unliked') {
                        var new_likes_count = counter - 1;
                        count_span.innerText = new_likes_count > -1 ? new_likes_count : 0;
                        img.src = '/static/img/heart-outline.svg';
                    }
                }
            });
        }
    });

    $('#sign-form').submit(function(event) {
        event.preventDefault();

        var button_text = window.getComputedStyle(
            document.querySelector('#registration-submit'), ':before'
        ).getPropertyValue('content');

        var email = $('#email').val();
        var password = $('#password').val();

        // yep...
        if (button_text === '"Sign Up"') {
            var username = $('#username').val();
            if (!username) {
                alert('You must enter a username!');
                return false;
            }

            // The two password inputs
            var confirm_password = $('#password-match').val();

            // Check for equality with the password inputs
            if (password != confirm_password) {
                alert('Passwords must match!');
                return false;
            }

            firebase.auth().createUserWithEmailAndPassword(email, password).then(function(result) {
                var new_user = result.user;
                var uid = new_user.uid;
                var display_name = new_user.displayName;

                $.ajax({
                    url: backendHostUrl + '/new_user',
                    type: 'POST',
                    data: {
                        'uid': uid,
                        'display_name': username
                    },
                    success: function(response) {
                        console.log(response);
                        $('#user').text(username);

                        var user = firebase.auth().currentUser;
                        user.updateProfile({
                            displayName: username
                        }).then(function() {
                            console.log('Display name updated!');
                        }).catch(function() {
                            console.log('Couldn\'t set display name.');
                        });
                    }
                });

                return true;
            }).catch(function(error) {
                // Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                alert('Couldn\'t sign you up! ' + errorMessage);
                return false;
            });
        } else {
            firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
                // Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                alert('Couldn\'t sign you in! ' + errorMessage);
                return false;
            });
        }

        // don't need to check email and normal password field here
        // as they're checked with the required="true" html attribute
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

    $('#upload-form').submit(function(event) {
        event.preventDefault();
        var files = $('#file').get(0).files;
        var files_length = files.length;
        var caption_val = $.trim($('#caption').val());

        if (files_length === 0 && (caption_val === null || caption_val === '')) {
            alert('Please select a file and/or enter a caption');
            return false;
        }

        var formData = new FormData();
        formData.append('uid', uid);
        formData.append('caption', caption_val);
        formData.append('release-datetime', $('#release-datetime').val());
        $.each(files, function(i, file) {
            formData.append('file', file);
        });

        $.ajax({
            url: backendHostUrl + '/new_post',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                console.log(response);
                window.location.href = '/';
            }
        });

        return true;
    });

    $("#file").change(function() {
        if (!isValidFileExtension($(this))) {
            $(this).val('');
            displayInvalidExtensionAlert();
        }

        var size = 500; //MB
        var files = this.files;
        for (var i = 0; i < files.length; i++) {
            if (!isWithinSizeLimit(files[i], size)) {
                displayOverSizeLimitAlert(size);
                $(this).val('');
                break;
            }
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
        alert("Individual file(s) must be less than " + size + "MB");
    }

    $('#wrapper').on('form submit', '.delete-form', function(event) {
        event.preventDefault();

        var formData = new FormData($(this)[0]);
        formData.append('uid', uid);

        $.ajax({
            url: backendHostUrl + '/delete_post',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                window.location.href = '/';
            }
        });

        return true;
    })

    window.addEventListener('load', function() {
        configureFirebaseLogin();

        let today = moment().format('YYYY-MM-DDThh:mm')
        var release_time = document.getElementById('release-datetime');
        release_time.setAttribute('min', today);
    });
});
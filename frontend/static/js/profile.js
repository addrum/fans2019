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

// This is the host for the backend.
// TODO: When running Firenotes locally, set to http://localhost:8081. Before
// deploying the application to a live production environment, change to
// https://backend-dot-<PROJECT_ID>.appspot.com as specified in the
// backend's app.yaml file.
var backendHostUrl = 'http://localhost:8081';

$(function() {
    // [START gae_python_firenotes_config]
    // Obtain the following from the "Add Firebase to your web app" dialogue
    // Initialize Firebase
    var config = {
        apiKey: "yourapikeyhere",
        authDomain: "fans2019.firebaseapp.com",
        databaseURL: "https://fans2019.firebaseio.com",
        projectId: "fans2019",
        storageBucket: "fans2019.appspot.com",
        messagingSenderId: "767844996933",
        appId: "1:767844996933:web:895f352658946a5d"
    };
    // [END gae_python_firenotes_config]

    // This is passed into the backend to authenticate the user.
    var current_uid = null;
    firebase.initializeApp(config);
    var db = firebase.firestore();
    var storage = null;

    // Firebase log-in
    function configureFirebaseLogin() {

        storage = firebase.storage().ref();

        // [START gae_python_state_change]
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                $('#feed').show();
                var name = user.displayName;

                current_uid = user.uid;

                user.getIdToken().then(function(idToken) {
                    $('#user').text(user.displayName);
                    var profile_link = '/user/' + current_uid;
                    $('#profile-link').attr('href', profile_link);
                    $('#user-nav').show();

                    if (current_uid === profile_uid) {
                        getPosts(profile_uid);
                    } else {
                        displayPostsIfSubscriber(current_uid, profile_uid);
                    }
                });
            } else {
                $('#user-nav').hide();
                $('#feed').hide();
            }
        });
        // [END gae_python_state_change]
    }

    function getProfileData(profile_uid) {
        $.ajax({
            url: backendHostUrl + '/get_user',
            type: 'GET',
            data: {
                'uid': profile_uid
            },
            success: function(response) {
                setProfileData(JSON.parse(response), profile_uid);
            }
        });
    }

    function setProfileData(data, profile_uid) {
        try {
            $('#display_name').text(data['display_name']);
        } catch (err) {
            console.log(err);
        }
        try {
            $('#bio').text(data['bio']);
        } catch (err) {
            console.log(err);
        }
        try {
            var text = 'Likes: ' + data['total_likes'];
            $('#total_likes').text(text);
        } catch (err) {
            console.log(err);
        }
        try {
            var text = 'Posts: ' + data['total_posts'];
            $('#total_posts').text(text);
        } catch (err) {
            console.log(err);
        }
        try {
            file_path = constructCloudStorageFilePath(profile_uid,
                'images',
                data['display_image']
            );

            var promise = getFirebaseUrlForFile(file_path);
            promise.then(function(url) {
                var profile_img = document.getElementById('profile-img');
                profile_img.src = url;
            });
        } catch (err) {
            console.log(err);
        }
    }

    function getPosts(uid) {
        $.ajax({
            url: backendHostUrl + '/get_posts',
            type: 'GET',
            data: {
                'uid': uid,
                'current_uid': current_uid,
                'subscriptions_posts': false
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
            $('#feed').append("<p>User has no posts!</p>");
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
        html += '<div class="post_header d-flex pt-2 justify-content-end">';
        // posted time
        formatted_datetime = moment.unix(post['release_datetime']).format("DD MMMM YY HH:mm");
        html += '<p>Posted: ' + formatted_datetime + '</p>';
        // close post header
        html += '</div>';

        var file_promises = null;
        if (files && files.length > 0) {
            var files_array = getFilesHtml(files, post_id, author_id);
            file_promises = files_array[1];
            var files_html = files_array[0];
            html += files_html;
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
        if (current_uid === author_id) {
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

    function displayPostsIfSubscriber(uid, profile_uid) {
        $.ajax({
            url: backendHostUrl + '/is_subscriber',
            type: 'GET',
            data: {
                'uid': uid,
                'profile_uid': profile_uid
            },
            success: function(response) {
                getPosts(profile_uid);
                $('#subscribe_separator').after(getSubscribeButtonHtml(profile_uid, true));
            },
            error: function(response) {
                $('#feed').append("<p>You'll need to subscribe to this user to see their content!</p>");
                $('#subscribe_separator').after(getSubscribeButtonHtml(profile_uid, false));
            }
        });
    }

    function getSubscribeButtonHtml(profile_uid, subscribed) {
        var html = '<div id="subscribe_button_wrapper" class="col text-center">';
        html += '<button id="' + profile_uid + '-subscribe-button" type="button" class="btn btn-primary subscribe-button">';
        if (subscribed) {
            html += 'Subscribed <span class="badge badge-light">&#10004;</span>';
        } else {
            html += 'Subscribe';
        }
        html += '</button>';
        html += '</div>';
        html += '<div class="w-100 m-4"></div>';
        return html;
    }

    $(document).on('click', '.like-button', function() {
        var id_parts = this.id.split('-');
        var author_id = id_parts[0];
        var post_id = id_parts[1];
        var count_span = $(this).find('span')[1];
        var counter = parseInt(count_span.innerText);

        // don't like your own posts!
        if (author_id !== current_uid) {
            var img = $(this).find('span img')[0];

            $.ajax({
                url: backendHostUrl + '/like_unlike_post',
                type: 'POST',
                data: {
                    'uid': current_uid,
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

    $(document).on('click', '.subscribe-button', function() {
        var sub_button = $('#' + profile_uid + '-subscribe-button');

        if (profile_uid !== current_uid) {
            $.ajax({
                url: backendHostUrl + '/subscribe',
                type: 'POST',
                data: {
                    'uid': current_uid,
                    'subscribe_to': profile_uid
                },
                success: function(response) {
                    console.log(response);
                    sub_button.html('Subscribed <span class="badge badge-light">&#10004;</span>');
                }
            });
        }
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

    window.addEventListener('load', function() {
        configureFirebaseLogin();
        getProfileData(profile_uid);
    });
});
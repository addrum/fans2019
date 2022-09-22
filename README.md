# fans2019

Created to get experience with GCP and Firebase.

## Setup

### OS Independent
* Ensure python3.7 is installed 
* Install [Git Flow] - some git clients can do this for you
* Obtain credentials and store them in a folder `credentials` in the repo root
* Download the [Cloud SDK]
* Come back here once you've added the [Cloud SDK] to the path
* Run the following commands:
    * `gcloud components update`
    * `gcloud auth application-default login`
    * `gcloud auth login`

### Windows
* Ensure the [Cloud SDK] is added to the path (this should happen automatically but double check)
* Set `%GOOGLE_APPLICATION_CREDENTIALS%` to the path to your Firebase credentials (https://firebase.google.com/docs/admin/setup/)
* Ensure python3.7 is installed 
    * You may need to rename the python.exe where you installed it to python3.exe
    * Make sure both the install directory and the `Scripts` subdirectory are added to the path
* Open a cmd and `cd` to `fans2019/scripts`
* Run `call setup.bat` to install dependencies in the correct place and setup a virtual env in the folder above `fans2019`

#### Launching the development server
* cd to `fans2019/scripts`
* Run `call launch_frontend.bat` to launch the front end server at `localhost:8080`
* Run `call launch_backend.bat` to launch the back end server at `localhost:8081`

### Linux
* Extract the [Cloud SDK] to an appropriate location (`/usr/local/google-cloud-sdk`)
* Ensure the [Cloud SDK] is added to the path by running `./google-cloud-sdk/install.sh`
* Open a new terminal for the changes in the previous to take effect
* Run `./google-cloud-sdk/bin/gcloud init`
* `cd` to `fans2019/scripts`
* Run `source setup.sh` to install dependencies in the correct place and setup a virtual env in the folder above `fans2019`
    * ensure you `chmod +x setup.sh`

#### Launching the development server
* cd to `fans2019/scripts`
* ensure you `chmod +x` `launch_frontend.sh` and `launch_backend.sh`
* Run `source launch_frontend.sh` to launch the front end server at `localhost:8080`
* Run `source launch_backend.sh` to launch the back end server at `localhost:8081`

## Current Database Structure
The database used is stored in [Firebase] (using the Firestore database).

```
display: {
    image: "",
    name: "",
},
posts: {
    firebase-generated-id: {
        author_id; uid,
        caption: "this is my caption",
        release_datetime: utc_timestamp,
        total_likes: 1,
        likes: {
            user-id1: {
                datetime: utc_timestamp
            },
            user-id2: {
                datetime: utc_timestamp
            }
        },
        files: {
            firebase-generated-id: {
                content_type: "image/jpeg",
                file_name: "sha256'd-filename.extension",
            }
        }
    },
},
users: {
    firebase-generated-id: {
        banner_image: ""
        bio: "",
        display_name: "",
        display_image: "",
        price: 10.00,
        total_posts: 1,
        total_likes: 1,
        signed_up: utc_timestamp,
        subscriptions: {
            user-id1: {
                datetime: utc_timestamp
            },
            user-id2: {
                datetime: utc_timestamp
            }
        },
        subscribers: {
            user-id1: {
                datetime: utc_timestamp
            },
            user-id2: {
                datetime: utc_timestamp
            }
        },
    },
}
```

## Current Firestore Rules
The current rules:
* allow a user to be created if they are signed in
* allow a user document to be read if the active session is signed in
* allow a post to be created, updated or deleted if the current user matches the post's owner
* allow a post and it's files to be read if the active session is signed in (allows users to see other's posts)
* allow a post to be liked only once by a user
* allow a user to subscribe to someone once
* allow a display name to be set for a user by that user only

```
service cloud.firestore {
    match /databases/{database}/documents {
        function isUserSignedIn() {
            return request.auth.uid != null;
        }
    
        match /users/{user} {
            function isCurrentUser() {
                return request.auth.uid == user;
            }
        
            allow read: if isUserSignedIn();
            allow write: if isCurrentUser();
               
            match /subscribers/{subscriber} {
                allow create, delete, read: if request.auth.uid == subscriber && !isCurrentUser();
                allow update: if false;
            }
          
            match /subscriptions/{subscription} {
                allow create, delete, read: if isCurrentUser();
                allow update: if false;
            }
        }
        
        match /posts/{post} {
            function isCurrentUser() {
                return request.auth.uid == resource.data.owner_id;
            }
            
            allow create, delete: if isCurrentUser();
            // a logged in user needs to be able to update a post
            // so that we can update 'total_likes'
            allow read, update: if isUserSignedIn();
              
            match /files/{file} {
                allow write, delete: if isCurrentUser();
                allow read: if isUserSignedIn();
            }

            match /likes/{user_id} {
                // only add the user's like if it doesn't already exist
                allow create, read: if request.auth.uid == user_id;
                // needed so when the owner of a post deletes it
                // we can remove the likes
                allow delete: if isUserSignedIn();
                allow update: if false;
            }
        }
        
        match /display/{display_name} {
            function isCurrentUser() {
                return request.auth.uid == display_name;
            }
            
            allow create, delete, update: if isCurrentUser();
            allow read: if true;
        }
    }
}
```

[Cloud SDK]:https://cloud.google.com/sdk/docs/
[Firebase]:https://console.firebase.google.com
[Git Flow]:https://github.com/nvie/gitflow/wiki/Installation
from datetime import datetime, timezone
import json
import logging
import math
import os

from flask import Flask, redirect, render_template, request
import flask_cors

from database import display
from database import post
from database import posts
from database import user
from database import users
from storage import bucket
from storage import file
import sys
sys.path.append(".")
from utilities import datetime_utilities

app = Flask(__name__)
flask_cors.CORS(app)


@app.route('/new_user', methods=['POST'])
def save_new_user():
    """
    Save a new user to firestore
    """
    logging.info('/new_user')

    body = request.form
    if not body:
        return 'Unauthorised', 401

    if 'uid' not in body or 'display_name' not in body:
        return 'Unauthorised', 401

    uid = body['uid']
    if not uid:
        return 'Unauthorised', 401

    display_name = body['display_name']
    if not uid:
        return 'Unauthorised', 401

    display.set(uid, display_name)
    user.set(uid, display_name)

    return 'OK', 200


@app.route('/get_posts', methods=['GET'])
def get_posts():
    """
    Return a list of of posts for a user and their subscriptions
    sorted by release_datetime, newest first.
    """
    logging.info('/get_posts')

    uid = request.args.get('uid')
    if not uid:
        return 'Unauthorised', 401

    current_uid = request.args.get('current_uid')
    if not current_uid:
        return 'Unauthorised', 401

    users_posts = posts.get(uid, current_uid)

    get_sub_posts = request.args.get('subscriptions_posts')
    subscriptions_posts = []
    if get_sub_posts == 'true':
        subscriptions_posts = posts.get_subscriptions_posts(uid, current_uid)

    json_posts = []
    if users_posts or subscriptions_posts:
        json_posts = posts.get_ordered_by(
            users_posts, subscriptions_posts)

    return json.dumps(json_posts)


@app.route('/new_post', methods=['POST'])
def upload():
    logging.info('/new_post')

    body = request.form
    if not body:
        return 'Unauthorised', 401

    if 'uid' not in body:
        logging.info('uid not in body so not making new post')
        return 'Unauthorised', 401

    uid = body['uid']
    caption = body['caption']

    new_post_document = post.new()

    files = request.files.getlist('file')
    for uploading_file in files:
        file_size = file.get_file_size_in_mb(uploading_file)
        max_size = app.config['MAX_POST_FILE_SIZE']
        if file_size > max_size:
            return f'File size must be less than {max_size}MB', 413

        uploaded_blob = upload_image_file(uid, uploading_file, new_post_document.id)
        files_ref = new_post_document.collection('files')
        files_ref.add(uploaded_blob.toJSON())

    release_datetime = body['release-datetime']

    if release_datetime:
        formatted_release_datetime = datetime.strptime(
            release_datetime, '%Y-%m-%dT%H:%M')
        logging.debug(f'formatted_release_datetime {formatted_release_datetime}')

        localised_datetime = datetime_utilities.localise_datetime(
            formatted_release_datetime)
        logging.info(f'localised_datetime {localised_datetime}')

        timestamp = datetime_utilities.datetime_to_utc_timestamp_non_naive(
            localised_datetime)
    else:
        timestamp = datetime_utilities.get_current_utc_timestamp()

    logging.info(f'timestamp {timestamp}')
    post.set(new_post_document, uid, timestamp, caption)

    return 'OK', 200


def upload_image_file(user_uid, file, post_id):
    """
    Upload the user-uploaded file to Google Cloud Storage.
    Returns the file's key in the database
    """
    if not file or not user_uid or user_uid == 'null' or not post_id:
        return None

    folder_path = f'{user_uid}/{post_id}'

    folder_created = bucket.check_create_folder(folder_path)

    if not folder_created:
        return None

    uploaded_blob = bucket.upload_file(
        file.read(),
        file.filename,
        file.content_type,
        True,
        folder_path
    )

    logging.info(f'Uploaded file {uploaded_blob.file_name} to cloud storage')

    return uploaded_blob


@app.route('/delete_post', methods=['POST'])
def delete_post():
    """
    Delete the specified post and all it's files
    """
    logging.info('/delete_post')

    body = request.form
    if not body:
        return 'Unauthorised', 401

    logging.info(f'body {body}')

    if 'uid' not in body or 'post_id' not in body:
        logging.info('no uid or post_id found so not deleting post')
        return 'Unauthorised', 401

    uid = body['uid']
    post_id = body['post_id']

    if uid and post_id:
        post.delete(post_id, uid)
        folder = '{}/{}'.format(uid, post_id)
        bucket.delete_folder(folder)

    return 'OK', 200


@app.route('/get_users', methods=['GET'])
def get_users():
    """
    Return a list of all users
    """
    logging.info('/get_users')

    return json.dumps(users.get())


@app.route('/subscribe', methods=['POST'])
def subscribe():
    """
    Subscribe to a specified
    """
    logging.info('/subscribe')

    body = request.form
    if not body:
        return 'Unauthorised', 401

    if 'uid' not in body or 'subscribe_to' not in body:
        return 'Unauthorised', 401

    uid = body['uid']
    subscribe_to = body['subscribe_to']

    if not uid or not subscribe_to:
        return 'Unauthorised', 401

    if uid is subscribe_to:
        return 'Unauthorised', 401

    subscription_ref = user.get_subscription(uid, subscribe_to)
    snapshot = subscription_ref.get()
    exists = snapshot.exists
    if exists and not snapshot.get('is_current_subscriber'):
        user.resubscribe(subscription_ref, subscribe_to)
        return 'Resubscribed', 200
    elif not exists:
        user.add_subscription(subscription_ref, subscribe_to)
        return 'Subscribed', 200

    return 'OK', 200


@app.route('/is_subscriber', methods=['GET'])
def is_subscriber():
    """
    Return if a user is a subscriber or not
    """
    logging.info('/is_subscriber')

    uid = request.args.get('uid')
    if not uid:
        return 'Unauthorised', 401

    profile_uid = request.args.get('profile_uid')
    if not profile_uid:
        return 'Unauthorised', 401

    subscription_ref = user.get_subscription(uid, profile_uid)
    if subscription_ref.get().exists:
        return 'OK', 200
    else:
        return 'Not Found', 404


@app.route('/like_unlike_post', methods=['POST'])
def like_unlike_post():
    """
    Add the specified user to the "likes" collection for a post
    """
    logging.info('/like_unlike_post')

    body = request.form
    if not body:
        return 'Unauthorised', 401

    if 'uid' not in body or 'post_id' not in body:
        return 'Unauthorised', 401

    uid = body['uid']
    post_id = body['post_id']

    if not uid or not post_id:
        return 'Unauthorised', 401

    if post.already_liked(uid, post_id):
        return post.unlike(uid, post_id)
    else:
        return post.like(uid, post_id)


@app.route('/get_user', methods=['GET'])
def get_profile():
    """
    Return a user's profile data
    """
    logging.info('/get_profile')

    uid = request.args.get('uid')
    if not uid:
        return 'Unauthorised', 401

    return json.dumps(user.get(uid).get().to_dict())


@app.route('/update_user', methods=['POST'])
def update_user():
    """
    Update a user's information such as display name, bio etc
    """
    logging.info('/update_user')

    body = request.form

    if not body:
        return 'Unauthorised', 401

    if 'uid' not in body:
        return 'Unauthorised', 401

    user_id = body['uid']
    payload = {}
    display_payload = {}

    files = request.files
    if 'display_image' in files:
        display_image = files.getlist('display_image')[0]
        file_size = file.get_file_size_in_mb(display_image)
        max_size = app.config['MAX_PROFILE_IMAGE_SIZE']
        if file_size > max_size:
            return f'File size must be less than {max_size}MB', 413

        bucket.upload_profile_image(display_image, user_id)
        basename, extension = display_image.filename.rsplit('.', 1)
        new_filename = f'profile.{extension}'
        display_payload['image'] = new_filename
        payload['display_image'] = new_filename

    if 'display_name' in body:
        display_name = body['display_name']
        payload['display_name'] = display_name
        display_payload['display_name'] = display_name

    if 'bio' in body:
        payload['bio'] = body['bio']

    if 'price' in body:
        price = float(body['price'])
        price = math.floor(price * 100)/100.0

        if price < 5.00:
            return 'Price must be greater than 5.00!', 400
        payload['price'] = float(price)

    if 'banner_image' in files:
        banner_image = files.getlist('banner_image')[0]
        file_size = file.get_file_size_in_mb(banner_image)
        max_size = app.config['MAX_BANNER_IMAGE_SIZE']
        if file_size > max_size:
            return f'File size must be less than {max_size}MB', 413

        bucket.upload_banner_image(banner_image, user_id)

    user.update(user_id, payload)
    display.update(user_id, display_payload)

    return 'OK', 200


@app.errorhandler(500)
def server_error(e):
    """
    Log the error and stacktrace.
    """
    logging.exception('An error occurred during a request.')

    return 'An internal error occurred.', 500


if __name__ == "__main__":
    console = logging.StreamHandler()
    logger = logging.getLogger()
    format = logging.Formatter('[%(levelname)s] %(asctime)s: %(message)s')
    console.setFormatter(format)
    logger.setLevel('INFO')
    logger.addHandler(console)

    logging.info("backend __main__")

    app.config.from_pyfile('config.py')
    logging.info(app.config)
    app.run(host='127.0.0.1', port=8081, debug=True)

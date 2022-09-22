from datetime import datetime, timezone
import logging

from . import *
from . import user

import sys
sys.path.append("..")
from utilities import datetime_utilities


def get(post_id):
    """
    Return a reference to the specified post under "posts"
    """
    return get_posts_collection().document(post_id)


def get_like(uid, post_id):
    """
    Return a reference to the specified user's "like" under the
    specified post
    """
    return get(post_id).collection('likes').document(uid)


def get_likes(post_reference):
    """
    Return the list of users who liked a post
    """
    users_snapshot = post_reference.collection('likes').get()
    users = [user.id for user in users_snapshot]
    logging.debug(f'users {users}')
    return users


def already_liked(uid, post_id):
    """
    Return true if the specified user has already liked the post
    """
    return get_like(uid, post_id).get().exists


def new():
    """
    Return a reference to a new document with an auto generated id
    """
    return get_posts_collection().document()


def set(post_document, author_id, release_datetime, caption):
    """
    Add a new post document
    """
    payload = {
        'author_id': author_id,
        'caption': caption,
        'release_datetime': release_datetime,
        'total_likes': 0,
    }
    logging.info(f'new post payload: {payload}')

    post_document.set(payload)
    user.increment_posts(author_id)

    logging.info(f'saved post {post_document.id} to database')


def update(post_id, payload):
    """
    Update a post with the specified payload
    """
    logging.info(f'updating post {post_id} payload: {payload}')

    get(post_id).update(payload)

    logging.info(f'updated post {post_document.id}')


def delete(post_id, author_id):
    post_document = get_posts_collection().document(post_id)
    files_snapshot = post_document.collection('files').get()
    delete_collection(files_snapshot)
    likes_snapshot = post_document.collection('likes').get()
    delete_collection(likes_snapshot)
    post_document.delete()
    user.decrement_posts(author_id)
    logging.info(f'deleted post {post_id}')


def like(uid, post_id):
    """
    Add the specified user to the "likes" collection for a post
    """
    post_ref = get(post_id)
    if not post_ref.get().exists: return 'Not Found', 404

    # add the users like
    payload = {
        'liked_at': datetime_utilities.get_current_utc_timestamp()
    }
    get_like(uid, post_id).set(payload)

    # increment post's 'total likes'
    author_id = increment_likes_and_get_author_id(db.transaction(), post_ref)
    user.increment_likes(author_id)

    logging.info(f'{uid} liked {post_id}')
    return 'Liked', 200


def unlike(uid, post_id):
    """
    Add the specified user to the "likes" collection for a post
    """
    post_ref = get(post_id)
    if not post_ref.get().exists: return 'Not Found', 404

    # remove the users like
    get_like(uid, post_id).delete()

    # decrement post's 'total likes'
    author_id = decrement_likes_and_get_author_id(db.transaction(), post_ref)
    user.decrement_likes(author_id)

    logging.info(f'{uid} unliked {post_id}')
    return 'Unliked', 200


def get_files(post_reference):
    """
    Return the list of files for a post
    """
    files_snapshot = post_reference.collection('files').get()
    files = [file.to_dict() for file in files_snapshot]
    logging.debug(f'files {files}')
    return files


@firestore.transactional
def increment_likes_and_get_author_id(transaction, document_reference):
    """
    Increment 'total_likes' for a post and return the author id in a
    Firestore transaction
    """
    snapshot = document_reference.get(transaction=transaction)
    author_id = snapshot.get('author_id')
    transaction.update(document_reference, {
        'total_likes': snapshot.get('total_likes') + 1
    })
    return author_id


@firestore.transactional
def decrement_likes_and_get_author_id(transaction, document_reference):
    """
    Decrement 'total_likes' for a post and return the author id in a
    Firestore transaction
    """
    snapshot = document_reference.get(transaction=transaction)
    author_id = snapshot.get('author_id')
    transaction.update(document_reference, {
        'total_likes': snapshot.get('total_likes') - 1
    })
    return author_id

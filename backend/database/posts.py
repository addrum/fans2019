from datetime import datetime
import logging

from firebase_admin import firestore

from . import *
from . import user
from . import display
from . import post

import sys
sys.path.append("..")
from utilities import datetime_utilities


def get_subscriptions_posts(user_id, current_user, limit=25):
    """
    Return a dictionary of posts from the user's subscriptions.
    Limited to 25 by default.
    """
    posts = []
    logging.info(f'getting posts for user {user_id} subscriptions')
    subscriptions = user.get(user_id).collection('subscriptions')

    for sub in subscriptions.get():
        sub_posts = get(sub.id, current_user)

        posts += sub_posts

    return posts


def get(user_id, current_user, limit=25):
    """
    Return a dictionary of posts for a specified user document
    which include their caption, likes and files
    """
    posts = []
    logging.info(f'getting posts for user {user_id}')

    now = datetime_utilities.get_current_utc_timestamp()
    snapshot = get_posts_collection().where(
        u'author_id', u'==', user_id
    ).where(
        u'release_datetime', u'<=', now
    ).order_by(
        u'release_datetime',
        direction=firestore.Query.DESCENDING
    ).limit(limit).stream()

    display_info = display.get(user_id).get().to_dict()

    for item in snapshot:
        post_json = item.to_dict()
        post_reference = item.reference
        post_id = item.id

        # add the post id to the post dict so we can sort
        # the list of dictionaries by release_datetime later
        post_json.update({'post_id': post_id})

        # add the list of users who liked a post
        already_liked = True
        if user_id != current_user:
            already_liked = post.already_liked(current_user, post_id)
        post_json.update({'already_liked': already_liked})

        # add the list of files for a post
        post_files = post.get_files(post_reference)
        post_json.update({'files': post_files})

        # add the current display name
        post_json.update({'display_info': display_info})

        logging.debug(f'value {post_json}')

        posts.append(post_json)

    logging.info(f'posts: {posts}')
    return posts


def get_ordered_by(users_posts, subscriptions_posts, order_by='release_datetime'):
    """
    Combine two dictionaries, ordering them by `order_by`.
    """
    merged_posts = users_posts + subscriptions_posts
    sorted_posts = sorted(merged_posts, key=lambda x: x[
                          order_by], reverse=True)
    logging.info(f'sorted_posts sorted by {order_by}: {sorted_posts}')
    return sorted_posts

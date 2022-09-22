import logging

from firebase_admin import auth

from . import *

import sys
sys.path.append("..")
from utilities import datetime_utilities


def get(user_id):
    """
    Return a specific user's document reference under "users"
    """
    return get_users_collection().document(user_id)


def get_subscription(user_id, subscribe_to):
    """
    Return a user's subscription reference under "users/id/subscriptions"
    """
    return get(user_id).collection('subscriptions').document(subscribe_to)


def get_subscriber(user_id, subscribe_to):
    """
    Return a user's subscription reference under "users/id/subscribers"
    """
    return get(user_id).collection('subscribers').document(subscribe_to)


def set(user_id, display_name):
    """
    Save a new user to firestore including the "now" datetime as "signed_up".
    """

    payload = {
        'display_name': display_name,
        'price': 5.00,
        'signed_up': datetime_utilities.get_current_utc_timestamp(),
        'total_likes': 0,
        'total_posts': 0,
    }

    logging.info(f'new user payload: {payload}')

    get(user_id).set(payload)

    logging.info(f'saved new user {user_id}')


def update(user_id, payload):
    """
    Update a user's document fields
    """
    if len(payload) == 0:
        logging.info('payload empty so not updating user')
        return

    logging.info(f'updating user {user_id} info payload: {payload}')

    get(user_id).update(payload)

    if 'display_name' in payload:
        user = auth.update_user(
            user_id,
            display_name = payload['display_name']
        )
        logging.info(f'update display_name in firebase auth for {user.uid}')

    logging.info(f'updated user {user_id} info')


def add_subscription(subscription_ref, subscribe_to):
    """
    Subscribe a user to another user and update both subscriptions
    and subscribers
    """
    now = datetime_utilities.get_current_utc_timestamp()
    payload = {
        'initial_subscribe_datetime': now,
        'current_subscribe_datetime': now,
        'is_current_subscriber': True,
    }

    logging.info(f'new subscription payload: {payload}')

    subscription_ref.set(payload)

    user_id = subscription_ref.id
    logging.info(f'{user_id} subscribed to {subscribe_to}')

    get_subscriber(subscribe_to, user_id).set(payload)

    logging.info(f'saved new subcriber {user_id} for {subscribe_to}')


def resubscribe(subscription_ref, subscribe_to):
    """
    Update the current subscribe date time
    """
    now = datetime_utilities.get_current_utc_timestamp()
    payload = {
        'current_subscribe_datetime': now,
        'is_current_subscriber': True,
    }

    logging.info(f'update subscription payload: {payload}')

    subscription_ref.update(payload)

    user_id = subscription_ref.id
    logging.info(f'{user_id} resubscribed to {subscribe_to}')

    get_subscriber(subscribe_to, user_id).update(payload)

    logging.info(f'saved resubcriber {user_id} for {subscribe_to}')


def remove_subscription(user_id, subscribe_to):
    """
    "Remove" the user's subscription to another user by setting
    'is_current_subscriber' to False
    """
    payload = {
        'is_current_subscriber': False,
    }

    logging.info(f'remove subscription payload: {payload}')

    get_subscription(user_id, subscribe_to).update(payload)

    logging.info(f'removed subscription for {user_id} to {subscribe_to}')

    get_subscriber(subscribe_to, user_id).update(payload)

    logging.info(f'removed subcriber {user_id} from {subscribe_to}')


def increment_likes(user_id):
    """
    Incremenet the total likes (likes across a user's posts) for a user
    """
    user_ref = get(user_id)
    increment_field(db.transaction(), user_ref, 'total_likes')


def decrement_likes(user_id):
    """
    Decremenet the total likes (likes across a user's posts) for a user
    """
    user_ref = get(user_id)
    decrement_field(db.transaction(), user_ref, 'total_likes')


def increment_posts(user_id):
    """
    Incremenet the total posts (posts across a user) for a user
    """
    user_ref = get(user_id)
    increment_field(db.transaction(), user_ref, 'total_posts')


def decrement_posts(user_id):
    """
    Decremenet the total posts (posts across a user) for a user
    """
    user_ref = get(user_id)
    decrement_field(db.transaction(), user_ref, 'total_posts')

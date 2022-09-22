import logging

from firebase_admin import db

from . import *


def get(user_id):
    """
    Return a specific user's document reference under "display"
    """
    return get_display_collection().document(user_id)


def set(user_id, name):
    """
    Add a new display details document for the user_id
    """
    payload = {
        'name': name
    }

    logging.info(f'new display payload: {payload} for {user_id}')

    get(user_id).set(payload)

    logging.info(f'saved new display for {user_id}')


def update(user_id, payload):
    """
    Update a display document
    """
    if len(payload) > 2:
        raise Exception('payload length too great')

    if len(payload) == 2:
        if 'name' not in payload or 'image' not in payload:
            raise Exception('payload does not contain expected parameters')

    if len(payload) == 0:
        logging.info('payload empty so not updating display')
        return

    logging.info(f'updating display payload: {payload} for {user_id}')

    get(user_id).update(payload)

    logging.info(f'updated display for {user_id}')

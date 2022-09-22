import logging

from . import *


def get(limit=25):
    """
    Return a list of users. Primarily used for the 'discover' page.
    Limits to 25 users by default.
    """
    snapshot = get_users_collection().limit(limit).stream()

    users = []
    for user in snapshot:
        user_json = user.to_dict()
        logging.debug(f'user_json {user_json}')

        users.append({user.id: user_json})

    logging.info(f'users: {users}')
    return users

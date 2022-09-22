import json
import logging

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# Fetch the service account key JSON file contents
cred = credentials.Certificate(
    '../credentials/fans2019-firebase-adminsdk-r2euy-3f85563a69.json')

# Initialize the app with a service account, granting admin privileges
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://fans2019.firebaseio.com',
    'storageBucket': 'fans2019.appspot.com',
})

db = firestore.client()


def get_display_collection():
    """
    Return a collection reference representing "display"
    """
    return db.collection(u'display')


def get_posts_collection():
    """
    Return a collection reference representing "posts"
    """
    return db.collection(u'posts')


def get_users_collection():
    """
    Return a collection reference representing "users"
    """
    return db.collection(u'users')


def delete_collection(collection_snapshot):
    """
    Delete all documents in a collection using a batch
    NOTE: batches can only contain 500 ops so modify this
    when users start getting close to ~500 likes per post
    """
    batch = db.batch()
    for doc in collection_snapshot:
        logging.info(f'deleting {doc.id}')
        batch.delete(doc.reference)

    batch.commit()


@firestore.transactional
def increment_field(transaction, document_reference, field, amount=1):
    """
    Increment the specified field by an amount using a
    Firestore transaction
    """
    snapshot = document_reference.get(transaction=transaction)
    transaction.update(document_reference, {
        field: snapshot.get(field) + amount
    })


@firestore.transactional
def decrement_field(transaction, document_reference, field, amount=1):
    """
    Increment the specified field by an amount using a
    Firestore transaction
    """
    snapshot = document_reference.get(transaction=transaction)
    transaction.update(document_reference, {
        field: snapshot.get(field) - amount
    })

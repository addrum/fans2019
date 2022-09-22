# Copyright 2015 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from __future__ import absolute_import

import hashlib
import logging

from flask import current_app
from google.cloud import storage
import six
from werkzeug import secure_filename
from werkzeug.exceptions import BadRequest

from .blob import *
from .file import *

import sys
sys.path.append(".")
from utilities import datetime_utilities


def _get_storage_client():
    return storage.Client(
        project=current_app.config['PROJECT_ID'])


def _get_default_bucket():
    """
    Returns the default Cloud storage bucket as defined in
    the app config variable 'CLOUD_STORAGE_BUCKET'
    """
    client = _get_storage_client()
    return client.bucket(current_app.config['CLOUD_STORAGE_BUCKET'])


def _get_cloud_blob(name):
    """
    Returns a blob at the specified name from Cloud storage if it exists
    """
    bucket = _get_default_bucket()
    return bucket.blob(name)


def _safe_filename(filename):
    """
    Generates a safe filename that is unlikely to collide with existing objects
    in Google Cloud Storage.
    ``filename.ext`` is transformed into ``filename-YYYY-MM-DD-HHMMSS.ext``
    """
    filename = secure_filename(filename)
    basename, extension = filename.rsplit('.', 1)
    # hash the filename in case it contains a user's info
    basename = hashlib.sha256(basename.encode()).hexdigest()
    date = datetime_utilities.get_current_utc_timestamp()
    return f'{basename}-{date}.{extension}'


def _format_string_as_folder(folder):
    if not folder.endswith('/'):
        return f'{folder}/'

    return folder


def folder_exists(folder):
    """
    Checks if a folder exists in the default bucket
    """
    folder = _format_string_as_folder(folder)
    cloud_blob = _get_cloud_blob(folder)
    return cloud_blob.exists()


def check_create_folder(folder):
    """
    Creates a new folder ln Cloud storage if one does not already exist.
    Returns a success state (True for folder created or exists)
    """
    folder = _format_string_as_folder(folder)
    cloud_blob = _get_cloud_blob(folder)
    if cloud_blob.exists():
        return True

    try:
        # https://stackoverflow.com/a/47707857
        cloud_blob.upload_from_string(
            '',
            content_type='application/x-www-form-urlencoded;charset=UTF-8'
        )
        logging.info(f'created folder for user: {folder}')
    except:
        logging.exception(f'Exception when creating folder for user: {folder}')
        return False

    return True


def get_blobs(prefix, delimiter=None):
    """
    Gets all the blobs in the bucket that begin with the prefix.

    This can be used to list all blobs in a "folder", e.g. "public/".

    The delimiter argument can be used to restrict the results to only the
    "files" in the given "folder". Without the delimiter, the entire tree under
    the prefix is returned. For example, given these blobs:

        /a/1.txt
        /a/b/2.txt

    If you just specify prefix = '/a', you'll get back:

        /a/1.txt
        /a/b/2.txt

    However, if you specify prefix='/a' and delimiter='/', you'll get back:

        /a/1.txt

    returns a list of (internal) blob objects

    """
    prefix = _format_string_as_folder(prefix)
    logging.info(prefix)
    bucket = _get_default_bucket()
    cloud_blobs = bucket.list_blobs(prefix=prefix, delimiter=delimiter)

    blobs = []
    logging.debug('Cloud blobs:')
    for cloud_blob in cloud_blobs:
        logging.debug(cloud_blob.id)
        blob = Blob(
            cloud_blob.public_url,
            cloud_blob.content_type
        )
        blobs.append(blob)

    return blobs


def upload_file(file_stream, filename, content_type, random_filename, folder=None):
    """
    Upload a file to a given Cloud Storage bucket with a random filename.
    """
    check_extension(filename, current_app.config['ALLOWED_EXTENSIONS'])
    if random_filename:
        filename = _safe_filename(filename)

    return _upload_file(file_stream, filename, content_type, folder)


def _upload_file(file_stream, filename, content_type, folder=None):
    """
    Upload a file to a given Cloud Storage bucket.
    """
    if folder:
        folder = _format_string_as_folder(folder)
        name = f'{folder}{filename}'
        logging.info(f'uploading file at {name}')
        cloud_blob = _get_cloud_blob(f'{folder}{filename}')
    else:
        cloud_blob = _get_cloud_blob(filename)
        logging.info(f'uploading file at {filename}')

    cloud_blob.upload_from_string(
        file_stream,
        content_type=content_type
    )

    return Blob(
        cloud_blob.public_url,
        cloud_blob.content_type
    )


def upload_profile_image(file, uid):
    """
    Upload a file as the profile image for a user
    """
    filename = file.filename
    check_extension(filename, current_app.config[
                     'ALLOWED_PROFILE_EXTENSIONS'])
    basename, extension = filename.rsplit('.', 1)
    filename = f'profile.{extension}'
    _upload_file(file.read(), filename, file.content_type, f'{uid}/images')


def upload_banner_image(file, uid):
    """
    Upload a file as the banner image for a user
    """
    filename = file.filename
    check_extension(filename, current_app.config[
                     'ALLOWED_PROFILE_EXTENSIONS'])
    basename, extension = filename.rsplit('.', 1)
    filename = f'banner.{extension}'
    _upload_file(file.read(), filename, file.content_type, f'{uid}/images')


def delete_file(filename):
    """
    Delete a single file in cloud storage. Can specify the full path including folders
    """
    blob = _get_cloud_blob(filename)
    deleted_blob = blob.delete()
    logging.info(f'file deleted: {filename}')


def delete_folder(folder):
    """
    Delete a folder in cloud storage. Recursively deletes all files first.
    """
    bucket = _get_default_bucket()
    cloud_blobs = bucket.list_blobs(prefix=folder)
    for blob in cloud_blobs:
        blob.delete()

    blob = _get_cloud_blob(folder)
    logging.info(f'folder deleted: {folder}')

import json
import logging


class Blob(object):
    """
    Internal representation of a "blob" containing only the properties
    we need
    https://googleapis.github.io/google-cloud-python/latest/storage/blobs.html?highlight=blob#module-google.cloud.storage.blob
    """

    def __init__(self, url, content_type):
        self.content_type = content_type
        self.file_name = url

    def __str__(self):
        return f'blob file_name: {self.file_name} content type: {self.content_type}'

    def toJSON(self):
        """
        https://stackoverflow.com/a/15538391/1860436
        """
        return {
            'content_type': self.content_type,
            'file_name': self.file_name,
        }

    @property
    def file_name(self):
        return self._file_name

    @file_name.setter
    def file_name(self, id):
        parts = id.split('/')
        file = parts[-1]
        self._file_name = f'{file}'

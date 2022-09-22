import os

from werkzeug.exceptions import BadRequest


def check_extension(filename, allowed_extensions):
    if ('.' not in filename or
            filename.split('.').pop().lower() not in allowed_extensions):
        raise BadRequest(
            f'{filename} has an invalid name or extension')


def get_file_size_in_mb(file):
    """
    https://stackoverflow.com/a/22126842/1860436
    """
    if file.content_length:
        return file.content_length

    try:
        pos = file.tell()
        file.seek(0, 2)  # seek to end
        size = file.tell()
        file.seek(pos)  # back to original position
        return size
    except (AttributeError, IOError):
        pass

    # in-memory file object that doesn't support seeking or tell
    return 0  # assume small enough

# https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7

from datetime import datetime, timezone
import pytz


def get_current_timezone():
    """
    Return the current timezone as tzinfo
    """
    return datetime.now().astimezone().tzinfo


def localise_datetime(datetime_object):
    """
    Return a new non-naive datetime object localised to the current timezone
    """
    return datetime_object.replace(tzinfo=get_current_timezone())


def localise_datetime_to_timezone(datetime_object, timezone):
    """
    Return a new non-naive datetime object localised to the specified timezone
    """
    return datetime_object.replace(tzinfo=timezone)


def datetime_to_utc_timestamp_non_naive(datetime_object):
    """
    Return a new utc timestamp of the datetime_object
    """
    # define epoch, the beginning of times in the UTC timestamp world
    # here we're comparing two non-naive datetime objects
    epoch = datetime(1970, 1, 1, 0, 0, 0, tzinfo=pytz.UTC)
    timestamp = (datetime_object - epoch).total_seconds()
    return timestamp


def get_current_utc_timestamp():
    """
    Return a new utc timestamp representing 'now'
    """
    now = datetime.utcnow()
    # define epoch, the beginning of times in the UTC timestamp world
    # here we're comparing two naive datetime objects
    epoch = datetime(1970, 1, 1, 0, 0, 0)
    timestamp = (now - epoch).total_seconds()
    return timestamp

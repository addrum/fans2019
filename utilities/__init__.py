import logging


def log_object_methods(object):
    object_methods = [method_name for method_name in dir(object)
                      if callable(getattr(object, method_name))]
    logging.info(f'methods: {object_methods}')

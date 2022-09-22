def escape(string):
    """
    Return a string that's suitable for JavaScript to parse as JSON
    """
    return string.replace("'", "\\'").replace('\"', '\\"')

import json
import logging
import requests

from flask import Flask, Markup, redirect, render_template
import flask_cors

import sys
sys.path.append("..")
from utilities import javascript_utilities

app = Flask(__name__)
flask_cors.CORS(app)


@app.route('/', methods=['GET', 'POST'])
def index():
    logging.info('/index')
    return render_template('index.html')


@app.route('/discover')
def discover():
    logging.info('/discover')
    users = requests.get('http://localhost:8081/get_users').json()
    return render_template('discover.html', users=users)


@app.route('/user/<profile_uid>')
def profile(profile_uid):
    logging.info(f'/user/{profile_uid}')
    return render_template('profile.html', profile_uid=profile_uid)


@app.route('/settings')
def settings():
    logging.info(f'/settings')
    return render_template('settings.html')


@app.errorhandler(500)
def server_error(e):
    # Log the error and stacktrace.
    logging.exception('An error occurred during a request.')

    return 'An internal error occurred.', 500


@app.context_processor
def utility_functions():
    def print_in_console(message):
        logging.info(message)
        logging.info(type(message))

    return dict(mdebug=print_in_console)


if __name__ == "__main__":
    console = logging.StreamHandler()
    logger = logging.getLogger()
    format = logging.Formatter('[%(levelname)s] %(asctime)s: %(message)s')
    console.setFormatter(format)
    logger.setLevel('INFO')
    logger.addHandler(console)

    logging.info("frontend __main__")

    app.run(host='127.0.0.1', port=8080, debug=True)

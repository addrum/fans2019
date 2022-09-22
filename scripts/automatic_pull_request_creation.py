import json
import logging
import requests
import subprocess
import sys

repo = 'addrum/fans2019'
headers = {
    'Authorization': 'token 4a09a21fe1f9c070c4e93cd03c59a4ac45ddcd95'
}


def run_command_and_collect_output(command):
    print(f'running command {command}')
    output = subprocess.check_output(command, shell=True)
    return output.decode(sys.stdout.encoding).strip()


def get_branch_name():
    msg = run_command_and_collect_output(
        "git show -s --pretty=%d HEAD").strip()

    branch = msg.split(",")[-1]

    branch = branch.replace("origin/", "")
    branch = branch.replace(")", "")
    branch = branch.replace("(", "")
    branch = branch.replace(" ", "")
    branch = branch.replace("\n", "")

    return branch


def get_labels(branch_name):
    if branch_name.startswith('feature'):
        return 'feature'
    elif branch_name.startswith('fix'):
        return 'fix'
    elif branch_name.startswith('release'):
        return 'release'
    elif branch_name.startswith('hotfix'):
        return 'hotfix'
    elif branch_name.startswith('support'):
        return 'support'
    else:
        return None


def get_issues(branch_name):
    url = 'https://api.github.com/search/issues?q=repo:"{}" type:pr is:open head:{}'.format(
        repo, branch_name)
    response = requests.get(url, headers=headers)
    response_json = response.json()
    return response_json


def pull_request_exists(branch_name):
    total_count = get_issues(branch_name)['total_count']
    return total_count > 0


def add_labels_to_prs(branch_name):
    issues = get_issues(branch_name)
    for issue in issues['items']:
        issue_number = issue['number']
        url = f'https://api.github.com/repos/{repo}/issues/{issue_number}/labels'
        body = {
            'labels': [get_labels(branch_name)]
        }
        requests.post(
            url,
            headers=headers,
            data=json.dumps(body)
        )


if __name__ == "__main__":
    branch_name = get_branch_name()

    if branch_name.startswith('develop') or branch_name is 'master':
        print('not executing as on branch {}'.format(branch_name))
        sys.exit(0)

    if pull_request_exists(branch_name):
        print(f'pr already exists for {branch_name}')
        sys.exit(0)

    pr_url = f'https://api.github.com/repos/{repo}/pulls'

    body = {
        "title": branch_name,
        "head": branch_name,
        "base": "develop",
    }

    requests.post(
        pr_url,
        headers=headers,
        data=json.dumps(body)
    )

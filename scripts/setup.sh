virtualenv --python python3 ../../fans2019env
source ../../fans2019env/bin/activate
cd ../frontend
pip install -r requirements.txt --upgrade
cd ../backend
pip install -r requirements.txt --upgrade
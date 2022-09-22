virtualenv --python python3 ../../fans2019env
call ../../fans2019env/Scripts/activate.bat
cd ../frontend
python3 -m pip install -r requirements.txt --upgrade
cd ../backend
python3 -m pip install -r requirements.txt --upgrade


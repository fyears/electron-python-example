#!/usr/bin/env python
from __future__ import print_function
from time import sleep
import sys
from flask import Flask
app = Flask(__name__)

@app.route("/")
def hello():
    #sleep(5)
    return "Hello World!"

if __name__ == "__main__":
    print('oh hello')
    sys.stdout.flush()
    app.run()

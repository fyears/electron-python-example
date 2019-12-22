# Electron as GUI of Python Applications (Updated)

## tl;dr

This post shows how to use Electron as the GUI component of Python applications. (Updated version of one of my previous posts.) The frontend and backend communicate with each other using `zerorpc`. The complete code is on [GitHub repo](https://github.com/fyears/electron-python-example).

## important notice

**Disclaimer on Dec 2019: This article was originally written in 2017, and I haven't updated or maintained this repo for a long time. Right now (Dec 2019), the code in this article may be outdated, and may or may not be working!!!**

The following are copied from my [original post](https://www.fyears.org/2017/02/electron-as-gui-of-python-apps-updated.html). They should be the same. **If there are inconsistencies, the `README.md` on the GitHub repo is more accurate.**

## original post and debates

### attention

The current post is a **updated** version of the [previous post](https://www.fyears.org/2015/06/electron-as-gui-of-python-apps.html) a few years before. Readers do **NOT** need to read the previous post if haven't.

### debates

I didn't expect that the previous post attracted so many visitors. Some other people even posted it on Hacker News and Reddit. The previous post also attracted some criticisms. Here I would like to share my replies to some debates.

#### Do you know `Tkinter`, `GTK`, `QT` (`PySide` and `PyQT`), `wxPython`, `Kivy`, [`thrust`](https://github.com/breach/thrust), ...?

Yes, I know at least their existences and try a few of them. I still think `QT` is the best among them. BTW, [`pyotherside`](https://github.com/thp/pyotherside) is one of the actively maintaining bindings for Python. I am just offering another "web technology oriented" way here.

#### ... And [`cefpython`](https://github.com/cztomczak/cefpython).

It's more or less be in "lower level" than where Electron is. For example, `PySide` is based on it.

#### I can directly write things in JavaScript!

Correct. Unless some libraries such as `numpy` are not available in JS. Moreover, the original intention is using Electron / JavaScript / web technologies to **enhance Python Applications**.

#### I can use [`QT WebEngine`](http://doc.qt.io/qt-5/qtwebengine-index.html).

Go ahead and give it a try. But since you are using "web engine", why not also give Electron a try?

#### You have two runtimes!

Yes. One for JavaScript and one for Python. Unfortunately, Python and JavaScript are dynamic languages, which usually need run-time support.

## the architectures and the choice

In the previous post, I showed an example architecture: Python to build up a `localhost` server, then Electron is just a local web browser.

```text
start
 |
 V
+------------+
|            | start
|            +-------------> +-------------------+
|  electron  | sub process   |                   |
|            |               | python web server |
| (basically |     http      |                   |
|  browser)  | <-----------> | (business logic)  |
|            | communication |                   |
|            |               | (all html/css/js) |
|            |               |                   |
+------------+               +-------------------+
```

That is **just one not-so-efficient solution**.

Let's reconsider the core needs here: we have a Python application, and a Node.js application (Electron). How to combine them and communicate with each other?

**We actually need an interprocess communication (IPC) mechanism.** It is unavoidable unless Python and JavaScript have direct `FFI` for each other.

HTTP is merely one of the popular ways to implement IPC, and it was merely the first thing came up to my mind when I was writing the previous post.

We have more choices.

We can (and should) use `socket`. Then, based on that, we want an abstract messaging layer that could be implemented with [`ZeroMq`](http://zeromq.org/) that is one of the best messaging libraries. Moreover, based on that, we need to define some schema upon raw data that could be implemented with [`zerorpc`](http://www.zerorpc.io/).

(Luckily, `zerorpc` fits our needs here because it supports Python and Node.js. For more general languages support, check out [`gRPC`](http://www.grpc.io/).)

**Thus, in this post, I will show another example using `zerorpc` for communication as follows, which should be more efficient than what I showed in my previous post.**

```text
start
 |
 V
+--------------------+
|                    | start
|  electron          +-------------> +------------------+
|                    | sub process   |                  |
| (browser)          |               | python server    |
|                    |               |                  |
| (all html/css/js)  |               | (business logic) |
|                    |   zerorpc     |                  |
| (node.js runtime,  | <-----------> | (zeromq server)  |
|  zeromq client)    | communication |                  |
|                    |               |                  |
+--------------------+               +------------------+
```

## preparation

Attention: the example could be successfully run on my Windows 10 machine with Python 3.6, Electron 1.7, Node.js v6.

We need the python application, `python`, `pip`, `node`, `npm`, available in command line. For using `zerorpc`, we also need the C/C++ compilers (`cc` and `c++` in the command line, and/or MSVC on Windows).

The structure of this project is

```text
.
|-- index.html
|-- main.js
|-- package.json
|-- renderer.js
|
|-- pycalc
|   |-- api.py
|   |-- calc.py
|   `-- requirements.txt
|
|-- LICENSE
`-- README.md
```

As shown above, the Python application is wrapped in a subfolder. In this example, Python application `pycalc/calc.py` provides a function: `calc(text)` that could take a text like `1 + 1 / 2` and return the result like `1.5` (assuming it be like `eval()`). The `pycalc/api.py` is what we are going to figure out.

And the `index.html`, `main.js`, `package.json` and `renderer.js` are modified from [`electron-quick-start`](https://github.com/electron/electron-quick-start).

### Python part

First of all, since we already have the Python application running, the Python environment should be fine. I strongly recommend developing Python applications in `virtualenv`.

Try install `zerorpc`, and `pyinstaller` (for packaging). On Linux / Ubuntu we may need to run `sudo apt-get install libzmq3-dev` **before** `pip install`.

```bash
pip install zerorpc
pip install pyinstaller

# for windows only
pip install pypiwin32 # for pyinstaller
```

If properly configured, the above commands should have no problem. Otherwise, please check out the guides online.

### Node.js / Electron part

Secondly, try to configure the Node.js and Electron environment. I assume that `node` and `npm` can be invoked in the command line and are of latest versions.

We need to configure the `package.json`, especially the `main` entry:

```json
{
  "name": "pretty-calculator",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  },
  "dependencies": {
    "zerorpc": "git+https://github.com/0rpc/zerorpc-node.git"
  },
  "devDependencies": {
    "electron": "^1.7.6",
    "electron-packager": "^9.0.1"
  }
}
```

Clean the caches:

```bash
# On Linux / OS X
# clean caches, very important!!!!!
rm -rf ~/.node-gyp
rm -rf ~/.electron-gyp
rm -rf ./node_modules
```

```powershell
# On Window PowerShell (not cmd.exe!!!)
# clean caches, very important!!!!!
Remove-Item "$($env:USERPROFILE)\.node-gyp" -Force -Recurse -ErrorAction Ignore
Remove-Item "$($env:USERPROFILE)\.electron-gyp" -Force -Recurse -ErrorAction Ignore
Remove-Item .\node_modules -Force -Recurse -ErrorAction Ignore
```

Then run `npm`:

```bash
# 1.7.6 is the version of electron
# It's very important to set the electron version correctly!!!
# check out the version value in your package.json
npm install --runtime=electron --target=1.7.6

# verify the electron binary and its version by opening it
./node_modules/.bin/electron
```

~~The `npm install` will install `zerorpc-node` from [my fork](https://github.com/0rpc/zerorpc-node/pull/84) to skip building from sources.~~ Updated: the pull request of `zerorpc-node` was [merged](https://github.com/0rpc/zerorpc-node/pull/84) so everyone is encouraged to use the official repo instead.

(Consider [adding `./.npmrc`](https://docs.npmjs.com/files/npmrc) in the project folder if necessary.)

All libraries should be fine now.

#### optional: building from sources

If the above installation causes any errors **even while setting the electron version correctly**, we may have to build the packages from sources.

Ironically, to compile Node.js C/C++ native codes, we need to have `python2` configured, no matter what Python version we are using for our Python application. Check out the [official guide](https://github.com/nodejs/node-gyp).

Especially, if working on Windows, open PowerShell **as Administrator**, and run `npm install --global --production windows-build-tools` to install a separated Python 2.7 in `%USERPROFILE%\.windows-build-tools\python27` and other required VS libraries. We only need to do it at once.

Then, **clean `~/.node-gyp` and `./node_modules` caches as described above at first.**

Set the `npm` [for Electron](https://github.com/electron/electron/blob/master/docs/tutorial/using-native-node-modules.md), and install the required libraries.

Set the environment variables for Linux (Ubuntu) / OS X / Windows:

```bash
# On Linux / OS X:

# env
export npm_config_target=1.7.6 # electron version
export npm_config_runtime=electron
export npm_config_disturl=https://atom.io/download/electron
export npm_config_build_from_source=true

# may not be necessary
#export npm_config_arch=x64
#export npm_config_target_arch=x64

npm config ls
```

```powershell
# On Window PowerShell (not cmd.exe!!!)

$env:npm_config_target="1.7.6" # electron version
$env:npm_config_runtime="electron"
$env:npm_config_disturl="https://atom.io/download/electron"
$env:npm_config_build_from_source="true"

# may not be necessary
#$env:npm_config_arch="x64"
#$env:npm_config_target_arch="x64"

npm config ls
```

Then install things:

```bash
# in the same shell as above!!!
# because you want to make good use of the above environment variables

# install everything based on the package.json
npm install

# verify the electron binary and its version by opening it
./node_modules/.bin/electron
```

(Consider [adding `./.npmrc`](https://docs.npmjs.com/files/npmrc) in the project folder if necessary.)

## core functions

### Python part

We want to build up a ZeroMQ server in Python end.

Put `calc.py` into folder `pycalc/`. Then create another file `pycalc/api.py`. Check [`zerorpc-python`](https://github.com/0rpc/zerorpc-python) for reference.

```python
from __future__ import print_function
from calc import calc as real_calc
import sys
import zerorpc

class CalcApi(object):
    def calc(self, text):
        """based on the input text, return the int result"""
        try:
            return real_calc(text)
        except Exception as e:
            return 0.0
    def echo(self, text):
        """echo any text"""
        return text

def parse_port():
    return 4242

def main():
    addr = 'tcp://127.0.0.1:' + parse_port()
    s = zerorpc.Server(CalcApi())
    s.bind(addr)
    print('start running on {}'.format(addr))
    s.run()

if __name__ == '__main__':
    main()
```

To test the correctness, run `python pycalc/api.py` in one terminal. Then **open another terminal**, run this command and see the result:

```bash
zerorpc tcp://localhost:4242 calc "1 + 1"
## connecting to "tcp://localhost:4242"
## 2.0
```

After debugging, **remember to terminate the Python function**.

Actually, this is yet another **server**, communicated over `zeromq` over TCP, rather than traditional web server over HTTP.

### Node.js / Electron part

Basic idea: In the main process, spawn the Python child process and create the window. In the render process, use Node.js runtime and `zerorpc` library to communicate with Python child process. All the HTML / JavaScript / CSS are managed by Electron, instead of by Python web server (The example in the previous post used Python web server to dynamically generate HTML codes).

In `main.js`, these are default codes to start from, with nothing special:

```js
// main.js

const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const path = require('path')

let mainWindow = null
const createWindow = () => {
  mainWindow = new BrowserWindow({width: 800, height: 600})
  mainWindow.loadURL(require('url').format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))
  mainWindow.webContents.openDevTools()
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}
app.on('ready', createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
```

We want to add some code to spawn Python child process:

```js
// add these to the end or middle of main.js

let pyProc = null
let pyPort = null

const selectPort = () => {
  pyPort = 4242
  return pyPort
}

const createPyProc = () => {
  let port = '' + selectPort()
  let script = path.join(__dirname, 'pycalc', 'api.py')
  pyProc = require('child_process').spawn('python', [script, port])
  if (pyProc != null) {
    console.log('child process success')
  }
}

const exitPyProc = () => {
  pyProc.kill()
  pyProc = null
  pyPort = null
}

app.on('ready', createPyProc)
app.on('will-quit', exitPyProc)
```

In `index.html`, we have an `<input>` for input, and `<div>` for output:

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Hello Calculator!</title>
  </head>
  <body>
    <h1>Hello Calculator!</h1>
    <p>Input something like <code>1 + 1</code>.</p>
    <p>This calculator supports <code>+-*/^()</code>,
    whitespaces, and integers and floating numbers.</p>
    <input id="formula" value="1 + 2.0 * 3.1 / (4 ^ 5.6)"></input>
    <div id="result"></div>
  </body>
  <script>
    require('./renderer.js')
  </script>
</html>
```

In `renderer.js`, we have codes for initialization of `zerorpc` **client**, and the code for watching the changes in the input. Once the user types some formula into the text area, the JS send the text to Python backend and retrieve the computed result.

```js
// renderer.js

const zerorpc = require("zerorpc")
let client = new zerorpc.Client()
client.connect("tcp://127.0.0.1:4242")

let formula = document.querySelector('#formula')
let result = document.querySelector('#result')
formula.addEventListener('input', () => {
  client.invoke("calc", formula.value, (error, res) => {
    if(error) {
      console.error(error)
    } else {
      result.textContent = res
    }
  })
})
formula.dispatchEvent(new Event('input'))
```

## running

Run this to see the magic:

```bash
./node_modules/.bin/electron .
```

Awesome!

If something like dynamic linking errors shows up, try to clean the caches and install the libraries again.

```bash
rm -rf node_modules
rm -rf ~/.node-gyp ~/.electron-gyp

npm install
```

## packaging

Some people are asking for the packaging. This is easy: apply the knowledge of how to package Python applications and Electron applications.

### Python part

User [PyInstaller](http://www.pyinstaller.org/).

Run the following in the terminal:

```bash
pyinstaller pycalc/api.py --distpath pycalcdist

rm -rf build/
rm -rf api.spec
```

If everything goes well, the `pycalcdist/api/` folder should show up, as well as the executable inside that folder. This is the complete independent Python executable that could be moved to somewhere else.

**Attention: the independent Python executable has to be generated!** Because the target machine we want to distribute to may not have correct Python shell and/or required Python libraries. It's almost impossible to just copy the Python source codes.

### Node.js / Electron part

This is tricky because of the Python executable.

In the above example code, I write

```js
  // part of main.js
  let script = path.join(__dirname, 'pycalc', 'api.py')
  pyProc = require('child_process').spawn('python', [script, port])
```

However, once we package the Python code, **we should no longer `spawn` Python script**. Instead, **we should `execFile` the generated excutable**.

Electron doesn't provide functions to check whether the app is under distributed or not (at least I don't find it). So I use a workaround here: check whether the Python executable has been generated or not.

In `main.js`, add the following functions:

```js
// main.js

const PY_DIST_FOLDER = 'pycalcdist'
const PY_FOLDER = 'pycalc'
const PY_MODULE = 'api' // without .py suffix

const guessPackaged = () => {
  const fullPath = path.join(__dirname, PY_DIST_FOLDER)
  return require('fs').existsSync(fullPath)
}

const getScriptPath = () => {
  if (!guessPackaged()) {
    return path.join(__dirname, PY_FOLDER, PY_MODULE + '.py')
  }
  if (process.platform === 'win32') {
    return path.join(__dirname, PY_DIST_FOLDER, PY_MODULE, PY_MODULE + '.exe')
  }
  return path.join(__dirname, PY_DIST_FOLDER, PY_MODULE, PY_MODULE)
}
```

And change the function `createPyProc` to this:

```js
// main.js
// the improved version
const createPyProc = () => {
  let script = getScriptPath()
  let port = '' + selectPort()

  if (guessPackaged()) {
    pyProc = require('child_process').execFile(script, [port])
  } else {
    pyProc = require('child_process').spawn('python', [script, port])
  }

  if (pyProc != null) {
    //console.log(pyProc)
    console.log('child process success on port ' + port)
  }
}
```

The key point is, check whether the `*dist` folder has been generated or not. If generated, it means we are in "production" mode, `execFile` the executable directly; otherwise, `spawn` the script using a Python shell.

In the end, run [`electron-packager`](https://github.com/electron-userland/electron-packager) to generate the bundled application. We also want to exclude some folders (For example, `pycalc/` is no longer needed to be bundled), **using regex** (instead of glob, surprise!). The name, platform, and arch are inferred from `package.json`. For more options, check out the docs.

```bash
# we need to make sure we have bundled the latest Python code
# before running the below command!
# Or, actually, we could bundle the Python executable later,
# and copy the output into the correct distributable Electron folder...

./node_modules/.bin/electron-packager . --overwrite --ignore="pycalc$" --ignore="\.venv" --ignore="old-post-backup"
## Packaging app for platform win32 x64 using electron v1.7.6
## Wrote new app to ./pretty-calculator-win32-x64
```

I do not check `asar` format's availability. I guess it will slow down the startup speed.

After that, we have the generated packaged Electron in current directory! For me, the result is `./pretty-calculator-win32-x64/`. On my machine, it's around 170 MB (Electron itself occupies more than 84.2 MB). I also tried to compress it, the generated `.7z` file is around 43.3 MB.

Copy / Move the folder(s) to anywhere or other machines to check the result! :-)

## further faq

### full code?

See [GitHub `electron-python-example`](https://github.com/fyears/electron-python-example).

### solutions to errors

[issue #6](https://github.com/fyears/electron-python-example/issues/6): `... failed with KeyError`

[issue #7](https://github.com/fyears/electron-python-example/issues/7): `Uncaught Error: Module version mismatch. Expected 50, got 48.`

Uninstall everything, **set up the npm environment variables correctly especially for the electron version**, remember to `activate` the virtualenv if using Python `virtualenv`.

### further optimization?

Trim some unnecessary files in Python executable by configuring `pyinstaller` further. Trim Electron (is it possible?). Use even faster IPC methods (though `ZeroMQ` is one of the fastest in most cases).

What's more, use QT (huh??), rewrite necessary codes in Node.js / Go / C / C++ (huh??). You name it.

### Can I use other programming languages besides Python?

Sure. The solution described here can also be applied to any other programming languages besides Python. Except that, if you want to use Electron as GUI of C/C++ applications, I strongly recommend using Node.js native C/C++ communication mechanism instead of using IPC. Moreover, if you have Java, C# application, using `Swing` or `WPF` are much more mature choices.

But, unfortunately, Electron is not for mobile applications and it makes little sense even if possible. Please use native GUI on those platforms.

## conclusion and further thinkings

It's still a promising solution. For drawing interface, we want to use some markup language for declarative UI. HTML happens to be one of the best choices, and its companions JS and CSS happen to have one of the most optimized renderers: the web browser. That's why I am (so) interested in using web technologies for GUI when possible. A few years before the web browsers were not powerful enough, but the story is kind of different now.

I hope this post is helpful to you.

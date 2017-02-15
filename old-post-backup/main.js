const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.

// Report crashes to our server.
//electron.crashReporter.start();


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  //if (process.platform != 'darwin') {
    app.quit();
  //}
});

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {
  // call python?
  var subpy = require('child_process').spawn('python', ['./hello.py']);

  var rq = require('request-promise');
  var mainAddr = 'http://localhost:5000';

  var openWindow = function(){
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 800, height: 600});
    // and load the index.html of the app.
    // mainWindow.loadURL('file://' + __dirname + '/index.html');
    mainWindow.loadURL('http://localhost:5000');
    // Open the devtools.
    mainWindow.webContents.openDevTools();
    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null;
      // kill python
      subpy.kill('SIGINT');
    });
  };

  var startUp = function(){
    rq(mainAddr)
      .then(function(htmlString){
        console.log('server started!');
        openWindow();
      })
      .catch(function(err){
        //console.log('waiting for the server start...');
        startUp();
      });
  };

  // fire!
  startUp();
});

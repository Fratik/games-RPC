/* eslint-disable no-console */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const DiscordRPC = require('discord-rpc');
const Spotify = require('spotify.js');
const spotify = new Spotify();

const ClientId = '381507901510123521';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 390,
    height: 100,
    resizable: false,
    titleBarStyle: 'hidden',
  });

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true,
  }));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null)
    createWindow();
});

app.setAsDefaultProtocolClient(`discord-${ClientId}`);

const rpc = new DiscordRPC.Client({ transport: 'ipc' });

async function setActivity() {
  if (!rpc)
    return;

  const { track, playing_position } = await spotify.status();

  rpc.setActivity({
    details: `${track.track_resource.name} - ${track.artist_resource.name}`,
    state: track.album_resource.name,
    startTimestamp: Math.round(Date.now() / 1000) - Math.round(playing_position),
    largeImageKey: 'logo',
    instance: true,
  });
}

rpc.on('ready', async() => {
  await spotify.init();

  setActivity();

  setInterval(() => {
    setActivity();
  }, 15e3);
});

rpc.login(ClientId).catch(console.error);

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

const current = {};

async function setActivity() {
  if (!rpc)
    return;

  await rpc.setActivity({
    details: current.trackName,
    state: current.trackUri ? `${current.albumName}, ${current.artistName}` : undefined,
    largeImageKey: 'logo',
    smallImageKey: current.playing ? 'play' : 'pause',
    smallImageText: current.playing ? 'Playing' : 'Paused',
    startTimestamp: current.trackUri ?
      Math.round(Date.now() / 1000) - Math.round(current.time) :
      undefined,
    partyId: current.trackUri ? `party_${current.trackUri}` : undefined,
    spectateSecret: current.trackUri ? current.trackUri : undefined,
    instance: true,
  });

  console.log('Presence updated');
}

function stateChanged({ track, playing_position, playing }) {
  if (track.track_resource.uri !== current.trackUri)
    return true;
  if (playing_position !== current.time)
    return true;
  if (playing !== current.playing)
    return true;
  return false;
}

async function checkSpotify() {
  console.log('Checking Spotify...');
  const { track, playing_position, playing } = await spotify.status();
  if (!stateChanged({ track, playing_position, playing }))
    return console.log('Spotify state is current, not updating!');

  console.log('Updating presence...');

  current.playing = playing;
  current.trackName = track.track_resource.name;
  current.trackUri = track.track_resource.uri;
  current.artistName = track.artist_resource.name;
  current.albumName = track.album_resource.name;
  current.time = playing_position;
  setActivity();
}

rpc.on('ready', async() => {
  await spotify.init();

  rpc.subscribe('ACTIVITY_SPECTATE', ({ secret }) => {
    spotify.play(secret);
  });

  checkSpotify();
  setInterval(() => checkSpotify(), 5e3);
});

rpc.login(ClientId).catch(console.error);

/* eslint-disable no-console */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const DiscordRPC = require('discord-rpc');
const Spotify = require('spotify.js');
const spotify = new Spotify();

process.on('unhandledRejection', (err) => {
  console.error(err);
});

const ClientId = '381507901510123521';

app.setAsDefaultProtocolClient(`discord-${ClientId}`);

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

const rpc = new DiscordRPC.Client({ transport: 'ipc' });

const current = {};

async function setActivity() {
  if (!rpc)
    return;

  await rpc.setActivity({
    details: current.trackUri ? `${current.artistName} - ${current.trackName}` : undefined,
    state: current.albumName,
    largeImageKey: 'logo',
    smallImageKey: current.playing ? 'play' : 'pause',
    smallImageText: current.playing ? 'Playing' : 'Paused',
    startTimestamp: current.trackUri ? current.playing ?
      Math.round(Date.now() / 1000) - current.timeStart :
      undefined : undefined,
    endTimestamp: current.trackUri ? current.timeEnd ?
      Math.round(Date.now() / 1000) + (current.timeEnd - current.timeStart) :
      undefined : undefined,
    partyId: current.trackUri ? `party_${current.trackUri}` : undefined,
    spectateSecret: current.trackUri ? current.trackUri : undefined,
    instance: true,
  });

  console.log(`Presence updated: ${current.trackName}`);
}

function stateChanged({ track, playing, playing_position }) {
  if (track.track_resource.uri !== current.trackUri)
    return true;
  if (playing !== current.playing)
    return true;
  if (current.playing && Math.round(playing_position) === current.timeStart)
    return true;
  return false;
}

async function checkSpotify() {
  const { track, playing_position, playing } = await spotify.status();

  if (!track.track_resource)
    return;

  if (!stateChanged({ track, playing, playing_position }))
    return;

  current.playing = playing;
  current.trackName = track.track_resource.name;
  current.trackUri = track.track_resource.uri;
  current.artistName = track.artist_resource ? track.artist_resource.name : 'Unknown Artist';
  current.albumName = track.album_resource ? track.album_resource.name : 'Unknown Album';
  current.timeStart = Math.round(playing_position);
  current.timeEnd = playing ? track.length : undefined;

  if (current.trackName)
    current.trackName = current.trackName.padEnd(2, '\u200b');
  if (current.albumName)
    current.albumName = current.albumName.padEnd(2, '\u200b');
  if (current.artistName)
    current.artistName = current.artistName.padEnd(2, '\u200b');

  return setActivity();
}

rpc.on('ready', async() => {
  await spotify.init();

  rpc.subscribe('ACTIVITY_SPECTATE', ({ secret }) => {
    spotify.play(secret);
  });

  checkSpotify();

  setInterval(() => {
    checkSpotify();
  }, 5e3);
});

rpc.login(ClientId).catch(console.error);

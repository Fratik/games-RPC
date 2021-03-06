#!/usr/env/bin node

const packager = require('electron-packager');

const matrix = {
  mac: ['darwin', 'x64'],
  win: ['win32', 'ia32'],
  linux: ['linux', 'x64'],
};

const sel = matrix[process.argv[2]];

const opt = {
  name: 'Spotify RPC',
  appCopyright: 'RosieSnek 2k17',
  dir: '.',
  asar: true,
  overwrite: true,
  prune: true,
  out: './builds',
};

if (sel) {
  opt.platform = sel[0];
  opt.arch = sel[1];
} else {
  opt.all = true;
}

packager(opt).then((builds) => {
  for (const build of builds)
    // eslint-disable-next-line no-console
    console.log('->', `"${build}"`);
});

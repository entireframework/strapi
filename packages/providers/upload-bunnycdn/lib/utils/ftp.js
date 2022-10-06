'use strict';

const Client = require('ftp');
const queue = require('queue');

const ftpQueue = queue({
  concurrency: 1,
  autostart: true,
  timeout: null,
  results: [],
});

async function queuePush(q, fn) {
  return new Promise((resolveQ, rejectQ) => {
    q.push(() => fn().then(resolveQ).catch(rejectQ));
  });
}

function putFTPFile(options, file, ftpFolder, ftpFileName) {
  const ftp = new Client();

  return new Promise((resolve, reject) => {
    console.log('connecting', options, ftpFolder, ftpFileName);
    ftp.on('ready', resolve);
    ftp.on('error', reject);

    ftp.connect(options);
  }).then(() => {
    return new Promise((resolve, reject) => {
      console.log('put', `${ftpFolder}/${ftpFileName}`);
      ftp.mkdir(ftpFolder, true, () => {
        ftp.put(file, `${ftpFolder}/${ftpFileName}`, (err) => {
          if (err) {
            reject(err);
          }

          ftp.end();
          resolve();
        });
      });
    });
  });
}

function deleteFTPFile(options, fileName) {
  const ftp = new Client();

  return new Promise((resolve, reject) => {
    console.log('connecting', options, fileName);
    ftp.on('ready', resolve);
    ftp.on('error', reject);

    ftp.connect(options);
  }).then(() => {
    return new Promise((resolve, reject) => {
      console.log('delete', fileName);
      ftp.delete(fileName, (err) => {
        if (err) {
          reject(err);
        }

        ftp.end();
        resolve();
      });
    });
  });
}

module.exports = {
  putFTPFile(options, file, ftpFolder, ftpFileName) {
    return queuePush(ftpQueue, () => putFTPFile(options, file, ftpFolder, ftpFileName));
  },
  deleteFTPFile(options, fileName) {
    return queuePush(ftpQueue, () => deleteFTPFile(options, fileName));
  },
};

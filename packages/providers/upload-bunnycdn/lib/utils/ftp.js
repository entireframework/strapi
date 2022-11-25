'use strict';

const Client = require('ftp');
const queue = require('queue');

const connectTimeout = 60 * 1000; // 1 min
const uploadTimeout = 5 * 60 * 1000; // 5 min

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
    let rejected = false;
    const rejectFn = (err) => {
      if (!rejected) {
        rejected = true;
        reject(err);
      }
    };

    console.log('connecting', options, ftpFolder, ftpFileName);
    ftp.on('ready', resolve);
    ftp.on('error', rejectFn);
    ftp.on('close', (hadErr) => {
      if (hadErr) rejectFn();
    });
    setTimeout(rejectFn, connectTimeout);

    ftp.connect(options);
  }).then(() => {
    return new Promise((resolve, reject) => {
      let rejected = false;
      const rejectFn = (err) => {
        if (!rejected) {
          rejected = true;
          reject(err);
        }
      };

      console.log('put', `${ftpFolder}/${ftpFileName}`);
      ftp.on('ready', resolve);
      ftp.on('error', rejectFn);
      ftp.on('close', (hadErr) => {
        if (hadErr) rejectFn();
      });
      setTimeout(rejectFn, uploadTimeout);

      ftp.mkdir(ftpFolder, true, () => {
        ftp.put(file, `${ftpFolder}/${ftpFileName}`, (err) => {
          if (err) {
            rejectFn(err);
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
    let rejected = false;
    const rejectFn = (err) => {
      if (!rejected) {
        rejected = true;
        reject(err);
      }
    };

    console.log('connecting', options, fileName);
    ftp.on('ready', resolve);
    ftp.on('error', rejectFn);
    ftp.on('close', (hadErr) => {
      if (hadErr) rejectFn();
    });
    setTimeout(rejectFn, connectTimeout);

    ftp.connect(options);
  }).then(() => {
    return new Promise((resolve, reject) => {
      let rejected = false;
      const rejectFn = (err) => {
        if (!rejected) {
          rejected = true;
          reject(err);
        }
      };

      console.log('delete', fileName);
      ftp.on('ready', resolve);
      ftp.on('error', rejectFn);
      ftp.on('close', (hadErr) => {
        if (hadErr) rejectFn();
      });
      setTimeout(rejectFn, uploadTimeout);

      ftp.delete(fileName, (err) => {
        if (err) {
          rejectFn(err);
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

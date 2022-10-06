'use strict';

const queue = require('queue');
const axios = require('axios');
const { ApplicationError } = require('@strapi/utils').errors;
const ftp = require('./utils/ftp');

const uploadQueue = queue({
  concurrency: 1,
  autostart: true,
  timeout: null,
  results: [],
});

function isVideoType(file) {
  return file.mime && file.mime.includes('video');
}

async function queuePush(q, fn) {
  return new Promise((resolveQ, rejectQ) => {
    q.push(() => fn().then(resolveQ).catch(rejectQ));
  });
}

module.exports = {
  init({ cloudFolder, url, streamUrl, ftpOptions, libraryId, apiKey } = {}) {
    const deleteFile = (file, webp = false) => {
      console.log('bunnycdn: delete', file.name);

      if (!file.provider_metadata) {
        file.provider_metadata = {};
      }

      const isVideo = isVideoType(file);

      if (webp) {
        return file.provider_metadata.webp_id
          ? ftp
              .deleteFTPFile(ftpOptions, file.provider_metadata.webp_id)
              .then(() => {
                file.provider_metadata.webp_url = null;
                file.provider_metadata.webp_id = null;
              })
              .catch(() => {
                file.provider_metadata.webp_url = null;
                file.provider_metadata.webp_id = null;
              })
          : Promise.resolve();
      }

      if (file.provider_metadata.id) {
        return isVideo
          ? axios({
              url: `https://video.bunnycdn.com/library/${file.provider_metadata.libraryId}/videos/${file.provider_metadata.id}`,
              method: 'delete',
              headers: {
                AccessKey: apiKey,
                Accept: 'application/json',
              },
            })
              .catch((error) => console.error(error))
              .then(() => {
                file.provider_metadata.url = null;
                file.provider_metadata.id = null;
              })
          : ftp
              .deleteFTPFile(ftpOptions, file.provider_metadata.id)
              .then(() => {
                file.provider_metadata.url = null;
                file.provider_metadata.id = null;
              })
              .catch(() => {
                file.provider_metadata.url = null;
                file.provider_metadata.id = null;
              });
      }

      return Promise.resolve();
    };

    const upload = (file, webp = false) => {
      console.log('bunnycdn: upload', file.name);

      if (!file.provider_metadata) {
        file.provider_metadata = {};
      }

      const isVideo = isVideoType(file);
      const fileName = file.hash + file.ext;
      const bunnycdnId = `${cloudFolder}/${fileName}`;

      return isVideo
        ? queuePush(uploadQueue, () =>
            axios({
              url: `https://video.bunnycdn.com/library/${libraryId}/collections?search=${cloudFolder}`,
              method: 'get',
              headers: {
                AccessKey: apiKey,
                Accept: 'application/json',
              },
            })
              .then(async (res) => {
                if ((res.status === 200 || res.status === 201) && res.data) {
                  let collectionId;

                  if (res.data.items && res.data.items.find((item) => item.name === cloudFolder)) {
                    collectionId = res.data.items.find((item) => item.name === cloudFolder).guid;
                  } else {
                    collectionId = await axios({
                      url: `https://video.bunnycdn.com/library/${libraryId}/collections`,
                      method: 'post',
                      headers: {
                        'Content-Type': 'application/*+json',
                        AccessKey: apiKey,
                        Accept: 'application/json',
                      },
                      data: {
                        name: cloudFolder,
                      },
                    }).then((res) => {
                      if ((res.status === 200 || res.status === 201) && res.data) {
                        return res.data.guid;
                      }

                      throw new ApplicationError('cant create bunnycdn collection');
                    });
                  }

                  if (collectionId) {
                    return axios({
                      url: `https://video.bunnycdn.com/library/${libraryId}/videos?collection=${collectionId}&search=${fileName}`,
                      method: 'get',
                      headers: {
                        AccessKey: apiKey,
                        Accept: 'application/json',
                      },
                    }).then(async (res) => {
                      if ((res.status === 200 || res.status === 201) && res.data) {
                        let videoId;

                        if (
                          res.data.items &&
                          res.data.items.find((item) => item.title === fileName)
                        ) {
                          videoId = res.data.items.find((item) => item.title === fileName).guid;
                        } else {
                          videoId = await axios({
                            url: `https://video.bunnycdn.com/library/${libraryId}/videos`,
                            method: 'post',
                            headers: {
                              'Content-Type': 'application/*+json',
                              AccessKey: apiKey,
                              Accept: 'application/json',
                            },
                            data: {
                              title: fileName,
                              collectionId,
                            },
                          }).then(async (res) => {
                            if ((res.status === 200 || res.status === 201) && res.data) {
                              return res.data.guid;
                            }

                            throw new ApplicationError('cant create bunnycdn video');
                          });
                        }

                        if (videoId) {
                          return axios({
                            url: `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
                            method: 'put',
                            maxContentLength: Infinity,
                            maxBodyLength: Infinity,
                            headers: {
                              AccessKey: apiKey,
                              'Content-Type': 'application/json',
                              Accept: 'application/json',
                            },
                            data: file.stream || file.buffer,
                          }).then(async (res) => {
                            if (
                              ((res.status === 200 || res.status === 201) &&
                                res.data &&
                                res.data.success) ||
                              (res.status === 403 &&
                                res.data &&
                                res.data.message === 'The video has already been uploaded.')
                            ) {
                              file.provider_metadata.url = `${streamUrl}/${videoId}/original`;
                              file.provider_metadata.id = videoId;
                              file.provider_metadata.hls = `${streamUrl}/${videoId}/playlist.m3u8`;
                              file.provider_metadata.libraryId = libraryId;

                              return file;
                            }

                            throw new ApplicationError('cant upload bunnycdn video');
                          });
                        }

                        throw new ApplicationError('cant create bunnycdn video');
                      }

                      throw new ApplicationError('cant access bunnycdn collection');
                    });
                  }

                  throw new ApplicationError('cant create bunnycdn collection');
                }

                throw new ApplicationError('cant connect to bunnycdn api');
              })
              .catch((error) => console.error(error))
          )
        : ftp.putFTPFile(ftpOptions, file.stream || file.buffer, cloudFolder, fileName).then(() => {
            if (webp) {
              file.provider_metadata.webp_url = `${url}/${bunnycdnId}`;
              file.provider_metadata.webp_id = bunnycdnId;
            } else {
              file.provider_metadata.url = `${url}/${bunnycdnId}`;
              file.provider_metadata.id = bunnycdnId;
            }
          });
    };

    return {
      uploadStream(file) {
        return upload(file);
      },
      upload(file) {
        return upload(file);
      },
      delete(file) {
        return deleteFile(file);
      },
    };
  },
};

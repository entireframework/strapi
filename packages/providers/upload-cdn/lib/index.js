'use strict';

const fs = require('fs');
const path = require('path');
const bunnycdnProvider = require('@entireframework/provider-upload-bunnycdn');
const localProvider = require('@strapi/provider-upload-local');

module.exports = {
  init({ providers = {} } = {}) {
    const local = localProvider.init(providers.local);

    Object.keys(providers).forEach((provider) => {
      if (provider === 'bunnycdn' && providers[provider] && providers[provider].enabled) {
        providers[provider] = bunnycdnProvider.init(providers[provider]);
      } else {
        delete providers[provider];
      }
    });

    return {
      uploadStream(file) {
        return local.uploadStream(file).then(() =>
          Promise.all(
            Object.keys(providers).map((provider) => {
              if (!file.provider_metadata) {
                file.provider_metadata = {};
              }

              const providerFile = {
                ...file,
                stream: fs.createReadStream(
                  path.resolve(strapi.dirs.static.public, file.url.substring(1))
                ),
                provider_metadata: file.provider_metadata[provider],
              };

              return providers[provider].uploadStream(providerFile).then(() => {
                file.provider_metadata[provider] = providerFile.provider_metadata;
              });
            })
          )
        );
      },
      upload(file) {
        return local.upload(file).then(() =>
          Promise.all(
            Object.keys(providers).map((provider) => {
              if (!file.provider_metadata) {
                file.provider_metadata = {};
              }

              const providerFile = {
                ...file,
                provider_metadata: file.provider_metadata[provider],
              };

              return providers[provider].upload(providerFile).then(() => {
                file.provider_metadata[provider] = providerFile.provider_metadata;
              });
            })
          )
        );
      },
      delete(file) {
        return local.delete(file).then(() =>
          Promise.all(
            Object.keys(providers).map((provider) => {
              if (!file.provider_metadata) {
                file.provider_metadata = {};
              }

              const providerFile = {
                ...file,
                provider_metadata: file.provider_metadata[provider],
              };

              return providers[provider].delete(providerFile).then(() => {
                file.provider_metadata[provider] = providerFile.provider_metadata;
              });
            })
          )
        );
      },
    };
  },
};

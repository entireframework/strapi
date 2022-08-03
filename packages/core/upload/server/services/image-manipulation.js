'use strict';
/**
 * Image manipulation functions
 */
const fs = require('fs');
const { join } = require('path');
const sharp = require('sharp');
var ffmpeg = require('fluent-ffmpeg');

const { getService } = require('../utils');
const { bytesToKbytes } = require('../utils/file');

const FORMATS_TO_PROCESS = ['jpeg', 'png', 'webp', 'tiff', 'svg', 'gif'];
const FORMATS_TO_OPTIMIZE = ['jpeg', 'png', 'webp', 'tiff'];
const VIDEO_FORMATS_TO_PROCESS = ['mp4', '3gp', 'mov', 'avi'];
const VIDEO_FORMATS_TO_OPTIMIZE = ['mp4', '3gp', 'mov', 'avi'];

const writeStreamToFile = (stream, path) =>
  new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(path);
    stream.pipe(writeStream);
    writeStream.on('close', resolve);
    writeStream.on('error', reject);
  });

const getVideoMetadata = file => {
  return new Promise((resolve, reject) => {
    try {
      ffmpeg.ffprobe(file.getStream(), function(err, metadata) {
        console.log('ffprobe', metadata);

        if (err) {
          console.log(err);
        }

        if (metadata && metadata.streams) {
          const stream = metadata.streams.find(s => s.width && s.height);
          console.log('stream', stream);

          let width = metadata.width || stream.width;
          let height = metadata.height || stream.height;

          try {
            if (stream.display_aspect_ratio) {
              const wh = stream.display_aspect_ratio.split(':');

              if (wh.length === 2) {
                const newHeight = Math.floor((width / parseInt(wh[0])) * parseInt(wh[1]));
                if (!isNaN(newHeight)) {
                  height = newHeight;
                }
              }
            }

            if (stream.rotation && stream.rotation === '-90') {
              const newHeight = width;
              width = height;
              height = newHeight;
            }
          } catch (e) {
            console.log(e);
          }

          resolve({
            ...metadata.format,
            ...stream,
            width,
            height,
          });
        } else {
          reject();
        }
      });
    } catch (e) {
      reject();
    }
  });
};

const getImageMetadata = file => {
  return new Promise((resolve, reject) => {
    const pipeline = sharp();
    pipeline
      .metadata()
      .then(resolve)
      .catch(reject);
    file.getStream().pipe(pipeline);
  });
};

const getMetadata = file => {
  return getImageMetadata(file).catch(() =>
    getVideoMetadata(file).catch(() => {
      return {};
    })
  );
};

const getDimensions = async file => {
  const { width = null, height = null, duration = null } = await getMetadata(file);
  return { width, height, duration };
};

const THUMBNAIL_RESIZE_OPTIONS = {
  width: 245,
  height: 156,
  fit: 'inside',
};

const resizeFileTo = async (file, options, { name, hash, format }) => {
  const filePath = join(file.tmpWorkingDirectory, hash);
  await writeStreamToFile(
    file.getStream().pipe(
      sharp()
        .resize(options)
        .toFormat(format || (await getFormat(file)) || 'jpeg', {
          progressive: true,
          quality: 90,
        })
    ),
    filePath
  );

  const newFile = {
    name,
    hash,
    ext: file.ext,
    mime: file.mime,
    path: file.path || null,
    getStream: () => fs.createReadStream(filePath),
  };

  const { width, height, size } = await getMetadata(newFile);

  Object.assign(newFile, { width, height, size: bytesToKbytes(size) });
  return newFile;
};

const generateThumbnail = async file => {
  if (
    file.width > THUMBNAIL_RESIZE_OPTIONS.width ||
    file.height > THUMBNAIL_RESIZE_OPTIONS.height
  ) {
    const newFile = await resizeFileTo(file, THUMBNAIL_RESIZE_OPTIONS, {
      name: `thumbnail_${file.name}`,
      hash: `thumbnail_${file.hash}`,
    });
    return newFile;
  }

  return null;
};

const optimize = async file => {
  const { sizeOptimization = false, autoOrientation = false } = await getService(
    'upload'
  ).getSettings();

  const newFile = { ...file };

  const { width, height, size, format } = await getMetadata(newFile);

  if (sizeOptimization || autoOrientation) {
    const transformer = sharp();
    transformer[format]({ quality: sizeOptimization ? 80 : 100 });
    if (autoOrientation) {
      transformer.rotate();
    }

    const filePath = join(file.tmpWorkingDirectory, `optimized-${file.hash}`);
    await writeStreamToFile(file.getStream().pipe(transformer), filePath);
    newFile.getStream = () => fs.createReadStream(filePath);
  }

  const { width: newWidth, height: newHeight, size: newSize } = await getMetadata(newFile);

  if (newSize > size) {
    // Ignore optimization if output is bigger than original
    return Object.assign({}, file, { width, height, size: bytesToKbytes(size) });
  }

  return Object.assign(newFile, {
    width: newWidth,
    height: newHeight,
    size: bytesToKbytes(newSize),
  });
};

const DEFAULT_BREAKPOINTS = {
  large: 1000,
  medium: 750,
  small: 500,
};

const getBreakpoints = () => strapi.config.get('plugin.upload.breakpoints', DEFAULT_BREAKPOINTS);

const generateResponsiveFormats = async file => {
  const { responsiveDimensions = false } = await getService('upload').getSettings();

  if (!responsiveDimensions) return [];

  const originalDimensions = await getDimensions(file);
  const format = await getFormat(file);

  const breakpoints = {
    ...getBreakpoints(),
    original: originalDimensions,
  };

  return Promise.all(
    Object.keys(breakpoints)
      .map(key => {
        const breakpoint = breakpoints[key];

        if (breakpointSmallerThan(breakpoint, originalDimensions)) {
          return [
            generateBreakpoint(key, {
              file,
              width: breakpoint.width || breakpoint,
              height: breakpoint.height || breakpoint,
              originalDimensions,
              format: format !== 'webp' ? format : 'jpeg',
            }),
            generateBreakpoint(key + '-webp', {
              file,
              width: breakpoint.width || breakpoint,
              height: breakpoint.height || breakpoint,
              originalDimensions,
              format: 'webp',
            }),
          ];
        }

        return [];
      })
      .reduce((acc, v) => acc.concat(v), [])
  );
};

const generateBreakpoint = async (key, { file, width, height, format }) => {
  const newFile = await resizeFileTo(
    file,
    {
      width,
      height,
      fit: 'inside',
    },
    {
      name: `${key}_${file.name}`,
      hash: `${key}_${file.hash}`,
      format,
    }
  );
  return {
    key,
    file: newFile,
  };
};

const breakpointSmallerThan = (breakpoint, { width, height }) => {
  return breakpoint < width || breakpoint < height;
};

// TODO V5: remove isSupportedImage
const isSupportedImage = (...args) => {
  process.emitWarning(
    '[deprecated] In future versions, `isSupportedImage` will be removed. Replace it with `isImage` or `isOptimizableImage` instead.'
  );

  return isOptimizableImage(...args);
};

const getFormat = async file => {
  try {
    return (await getMetadata(file)).format || file.ext.substring(1);
  } catch (e) {
    // throw when the file is not a supported image
    return null;
  }
};

const isOptimizableImage = async file => {
  let format = await getFormat(file);
  return format && FORMATS_TO_OPTIMIZE.includes(format);
};

const isImage = async file => {
  let format = await getFormat(file);
  return format && FORMATS_TO_PROCESS.includes(format);
};

const isOptimizableVideo = async file => {
  let format = await getFormat(file);
  return format && VIDEO_FORMATS_TO_OPTIMIZE.includes(format);
};

const isVideo = async file => {
  let format = await getFormat(file);
  return format && VIDEO_FORMATS_TO_PROCESS.includes(format);
};

module.exports = () => ({
  isSupportedImage,
  isOptimizableImage,
  isOptimizableVideo,
  isImage,
  isVideo,
  getDimensions,
  generateResponsiveFormats,
  generateThumbnail,
  optimize,
});

'use strict';
/**
 * Image manipulation functions
 */
const fs = require('fs');
const { join } = require('path');
const sharp = require('sharp');
var ffmpeg = require('fluent-ffmpeg');
const queue = require('queue');

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
      ffmpeg.ffprobe(file.path || file.getStream(), function(err, metadata) {
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
    (file.path ? fs.createReadStream(file.path) : file.getStream()).pipe(pipeline);
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
  const { responsiveQuality = 90 } = await getService('upload').getSettings();

  const filePath = join(file.tmpWorkingDirectory, hash);
  await writeStreamToFile(
    file.getStream().pipe(
      sharp()
        .resize(options)
        .toFormat(format || (await getFormat(file)) || 'jpeg', {
          progressive: true,
          quality: responsiveQuality,
        })
    ),
    filePath
  );

  const newFile = {
    name,
    hash,
    ext: file.ext,
    mime: file.mime,
    getStream: () => fs.createReadStream(filePath),
  };

  const { width, height, size } = await getMetadata(newFile);

  Object.assign(newFile, { width, height, size: bytesToKbytes(size) });
  return newFile;
};

const generateThumbnail = async file => {
  if (!file.width || !file.height || !file.size) {
    const { width, height, size } = await getMetadata(file);
    file.width = width;
    file.height = height;
    file.size = size;
  }

  if (
    file.width > THUMBNAIL_RESIZE_OPTIONS.width ||
    file.height > THUMBNAIL_RESIZE_OPTIONS.height
  ) {
    const isVideoFile = await isVideo(file);
    if (isVideoFile) {
      file = await generatePoster(file);
    }

    const newFile = await resizeFileTo(file, THUMBNAIL_RESIZE_OPTIONS, {
      name: `thumbnail${isVideoFile ? '-poster' : ''}_${file.name}`,
      hash: `thumbnail${isVideoFile ? '-poster' : ''}_${file.hash}`,
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

    newFile.path = join(file.tmpWorkingDirectory, `optimized-${file.hash}`);
    await writeStreamToFile(file.getStream().pipe(transformer), newFile.path);
    newFile.getStream = () => fs.createReadStream(newFile.path);
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
  huge: 2560,
  large: 1920,
  big: 1366,
  medium: 1024,
  small: 768,
  tiny: 320,
};

const getBreakpoints = () => strapi.config.get('plugin.upload.breakpoints', DEFAULT_BREAKPOINTS);

const generateResponsiveFormats = async file => {
  const { responsiveDimensions = false } = await getService('upload').getSettings();

  if (!responsiveDimensions) return [];

  const isVideoFile = await isVideo(file);
  if (isVideoFile) {
    file = await generatePoster(file);
  }

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
            generateBreakpoint(key + (isVideoFile ? '-poster' : ''), {
              file,
              width: breakpoint.width || breakpoint,
              height: breakpoint.height || breakpoint,
              originalDimensions,
              format: format !== 'webp' ? format : 'jpeg',
            }),
            generateBreakpoint(key + (isVideoFile ? '-poster' : '') + '-webp', {
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
  return (breakpoint.width || breakpoint) <= width || (breakpoint.height || breakpoint) <= height;
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

const generatePoster = async file => {
  if (!(await isVideo(file))) {
    return;
  }

  file.path = join(file.tmpWorkingDirectory, file.hash);
  await writeStreamToFile(file.getStream(), file.path);

  const convertOptions = {
    streamEncoding: true,
    args: ['-ss', '00:00:00.000', '-vframes', '1', '-f', 'image2'],
    ext: '.png',
    name: 'png',
  };
  const newFileName =
    (file.name
      .split('.')
      .slice(0, -1)
      .join('.') || file.name) + '.png';
  const newFilePath = join(file.tmpWorkingDirectory, `poster_${file.hash}`);
  const newFileMime = 'image/' + convertOptions.name;
  const newFileExt = convertOptions.ext;

  if (!file.width || !file.height || !file.size) {
    const { width, height, size } = await getMetadata(file);
    file.width = width;
    file.height = height;
    file.size = size;
  }

  return new Promise((resolve, reject) => {
    console.log('generatePoster started', file.path, file.width + 'x' + file.height, newFilePath);
    convertVideo(file.path, file.width + 'x' + file.height, newFilePath, convertOptions, err => {
      console.log('generatePoster finished');

      if (err) {
        console.log('generatePoster error', err);

        reject();
      } else {
        resolve();
      }
    });
  })
    .then(async () => {
      fs.writeFileSync(
        newFilePath,
        await sharp(fs.readFileSync(newFilePath))
          .withMetadata()
          .resize({
            width: file.width,
            height: file.height,
            fit: 'fill',
          })
          .toBuffer()
      );
      let newFile = {
        name: newFileName,
        hash: file.hash,
        ext: newFileExt,
        mime: newFileMime,
        path: newFilePath,
        tmpWorkingDirectory: file.tmpWorkingDirectory,
        getStream: () => fs.createReadStream(newFilePath),
      };
      let { width, height, size, format } = await getMetadata(newFile);
      return optimize({ ...newFile, width, height, size, format });
    })
    .catch(e => {
      console.log('generatePoster error', e);
      return null;
    });
};

const ffmpegQueue = queue({
  concurrency: 1,
  autostart: true,
  timeout: null,
  results: [],
});

async function queuePush(q, fn) {
  return new Promise((resolveQ, rejectQ) =>
    q.push(() =>
      fn()
        .then(resolveQ)
        .catch(rejectQ)
    )
  );
}

const scale = function(width) {
  return `scale=${width}:-2`;
};

const convertVideo = function(input, size, output, options, callback) {
  queuePush(ffmpegQueue, () => {
    return new Promise(resolve => {
      var outputTmpFile = typeof output === 'string';

      try {
        var ffm = ffmpeg(input).outputOptions(options.args);
        ffm.on('start', function(commandLine) {
          console.log('Spawned Ffmpeg with command: ' + commandLine);
        });
        var match;
        // eslint-disable-next-line no-cond-assign
        if ((match = size.match(/(\d+)x(\d+)/))) {
          ffm.addOutputOptions('-vf', scale(match[1]));
        } else {
          ffm.size(size);
        }
        ffm.output(output);
      } catch (e) {
        callback(e);
        resolve();
        return;
      }

      ffm.on('progress', function(progress) {
        console.log('Processing: ' + progress.percent + '% done');
      });
      ffm.on('error', function(error, stdout, stderr) {
        error.stderr = stderr;
        callback(error);
        resolve();
      });

      if (outputTmpFile) {
        ffm.on('end', function() {
          callback();
          resolve();
        });
      }
      ffm.run();
      if (!outputTmpFile) {
        callback();
        resolve();
      }
    });
  });
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

'use strict';

/**
 * Image manipulation functions
 */
const fs = require('fs');
const { join } = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const queue = require('queue');
const gifResize = require('@gumlet/gif-resize');

const {
  file: { bytesToKbytes },
} = require('@strapi/utils');
const { getService } = require('../utils');

const FORMATS_TO_RESIZE = ['jpeg', 'png', 'webp', 'tiff', 'gif'];
const FORMATS_TO_PROCESS = ['jpeg', 'png', 'webp', 'tiff', 'svg', 'gif', 'avif'];
const FORMATS_TO_OPTIMIZE = ['jpeg', 'png', 'webp', 'tiff', 'avif', 'gif'];
const VIDEO_FORMATS_TO_PROCESS = ['mp4', '3gp', 'mov', 'avi', 'm4v'];
const VIDEO_FORMATS_TO_OPTIMIZE = ['mp4', '3gp', 'mov', 'avi', 'm4v'];
const AUDIO_FORMATS_TO_PROCESS = ['mp3', 'wav', 'm4a', 'flac', 'aac', 'wma'];

const convertVideoOptionsWebp = {
  streamEncoding: true,
  args: ['-vcodec', 'webp', '-loop', '0', '-pix_fmt', 'yuv420p', '-q', '90'],
  ext: '.webp',
  name: 'webp',
};

const writeStreamToFile = (stream, path) =>
  new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(path);
    // Reject promise if there is an error with the provided stream
    stream.on('error', reject);
    stream.pipe(writeStream);
    writeStream.on('close', resolve);
    writeStream.on('error', reject);
  });

const getVideoMetadata = (file) => {
  return new Promise((resolve, reject) => {
    try {
      ffmpeg.ffprobe(file.filepath || file.getStream(), (err, metadata) => {
        console.log('ffprobe', metadata);

        if (err) {
          console.log(err);
        }

        if (metadata && metadata.streams) {
          const stream = metadata.streams.find((s) => s.width && s.height) || metadata.streams[0];
          console.log('stream', stream);

          if (stream) {
            let width = metadata.width || stream.width;
            let height = metadata.height || stream.height;

            try {
              if (stream.display_aspect_ratio) {
                const wh = stream.display_aspect_ratio.split(':');

                if (wh.length === 2) {
                  const newHeight = Math.floor((width / parseInt(wh[0], 10)) * parseInt(wh[1], 10));
                  if (!Number.isNaN(newHeight)) {
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
            resolve({
              ...metadata.format,
            });
          }
        } else {
          reject();
        }
      });
    } catch (e) {
      reject();
    }
  });
};

const getImageMetadata = (file) => {
  if (!file.filepath) {
    return new Promise((resolve, reject) => {
      const pipeline = sharp();
      pipeline.metadata().then(resolve).catch(reject);
      file.getStream().pipe(pipeline);
    });
  }

  return sharp(file.filepath).metadata();
};

const getMetadata = (file) => {
  return getImageMetadata(file).catch(() =>
    getVideoMetadata(file).catch(() => {
      return {};
    })
  );
};

const getDimensions = async (file) => {
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
  const currentFormat = await getFormat(file);

  const newFilePath = join(
    file.tmpWorkingDirectory,
    `output_${hash}${convertVideoOptionsWebp.ext}`
  );

  let newInfo;

  if (currentFormat === 'gif') {
    if (!file.filepath) {
      file.filepath = join(file.tmpWorkingDirectory, hash);
      await writeStreamToFile(file.getStream(), file.filepath);
    }

    if (format === 'webp') {
      await new Promise((resolve, reject) => {
        console.log(
          'resizeFileTo started',
          file.filepath,
          `${options.width}x${options.height}`,
          newFilePath
        );

        convertVideo(
          file.filepath,
          `${options.width}x${options.height}`,
          newFilePath,
          convertVideoOptionsWebp,
          (err) => {
            console.log('resizeFileTo finished');

            if (err) {
              console.log('resizeFileTo error', err);

              reject();
            } else {
              resolve();
            }
          }
        );
      });
    } else {
      fs.writeFileSync(newFilePath, await gifResize(options)(fs.readFileSync(file.filepath)));
    }

    newInfo = await sharp(newFilePath).metadata();
  } else if (!file.filepath) {
    await writeStreamToFile(
      file.getStream().pipe(
        sharp()
          .resize(options)
          .toFormat(format || currentFormat || 'jpeg', {
            progressive: true,
            quality: responsiveQuality,
          })
      ),
      newFilePath
    );
  } else {
    newInfo = await sharp(file.filepath)
      .resize(options)
      .toFormat(format || currentFormat || 'jpeg', {
        progressive: true,
        quality: responsiveQuality,
      })
      .toFile(newFilePath);
  }

  const { width, height, size } = newInfo;

  const newFile = {
    name,
    hash,
    ext: file.ext,
    mime: file.mime,
    filepath: newFilePath,
    path: file.path || null,
    getStream: () => fs.createReadStream(newFilePath),
  };

  Object.assign(newFile, { width, height, size: bytesToKbytes(size), sizeInBytes: size });
  return newFile;
};

const generateThumbnails = async (file) => {
  const isVideoFile = await isVideo(file);
  const format = isVideoFile ? 'png' : await getFormat(file);

  return Promise.all([
    generateThumbnail(file, format !== 'webp' ? format : 'jpeg'),
    generateThumbnail(file, 'webp'),
  ]);
};

const generateThumbnail = async (file, format = undefined) => {
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
    let fileData = file;
    if (isVideoFile) {
      fileData = await generatePoster(file);
    }
    const key = `thumbnail${isVideoFile ? '-poster' : ''}${format === 'webp' ? '-webp' : ''}`;

    const newFile = await resizeFileTo(fileData, THUMBNAIL_RESIZE_OPTIONS, {
      name: `${key}_${fileData.name}`,
      hash: `${key}_${fileData.hash}`,
      format,
    });

    return {
      key,
      file: newFile,
    };
  }

  return null;
};

/**
 * Optimize image by:
 *    - auto orienting image based on EXIF data
 *    - reduce image quality
 *
 */
const optimize = async (file) => {
  const { sizeOptimization = false, autoOrientation = false } = await getService(
    'upload'
  ).getSettings();

  const { format, size } = await getMetadata(file);

  if ((sizeOptimization || autoOrientation) && format !== 'gif') {
    let transformer;
    if (!file.filepath) {
      transformer = sharp();
    } else {
      transformer = sharp(file.filepath);
    }

    // reduce image quality
    transformer[format]({ quality: sizeOptimization ? 80 : 100 });
    // rotate image based on EXIF data
    if (autoOrientation) {
      transformer.rotate();
    }
    const filePath = join(file.tmpWorkingDirectory, `optimized-${file.hash}`);

    let newInfo;
    if (!file.filepath) {
      transformer.on('info', (info) => {
        newInfo = info;
      });

      await writeStreamToFile(file.getStream().pipe(transformer), filePath);
    } else {
      newInfo = await transformer.toFile(filePath);
    }

    const { width: newWidth, height: newHeight, size: newSize } = newInfo;

    const newFile = { ...file };

    newFile.getStream = () => fs.createReadStream(filePath);
    newFile.filepath = filePath;

    if (newSize > size) {
      // Ignore optimization if output is bigger than original
      return file;
    }

    return Object.assign(newFile, {
      width: newWidth,
      height: newHeight,
      size: bytesToKbytes(newSize),
      sizeInBytes: newSize,
    });
  }

  return file;
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

const generateResponsiveFormats = async (file) => {
  const { responsiveDimensions = false } = await getService('upload').getSettings();

  if (!responsiveDimensions) return [];

  const isVideoFile = await isVideo(file);
  let fileData = file;
  if (isVideoFile) {
    fileData = await generatePoster(file);
  }

  const originalDimensions = await getDimensions(fileData);
  const format = isVideoFile ? 'png' : await getFormat(fileData);

  const breakpoints = {
    ...getBreakpoints(),
    original: originalDimensions,
  };

  return Promise.all(
    Object.keys(breakpoints)
      .map((key) => {
        const breakpoint = breakpoints[key];

        if (breakpointSmallerThan(breakpoint, originalDimensions)) {
          return [
            generateBreakpoint(key + (isVideoFile ? '-poster' : ''), {
              file: fileData,
              width: breakpoint.width || breakpoint,
              height: breakpoint.height || breakpoint,
              originalDimensions,
              format: format !== 'webp' ? format : 'jpeg',
            }),
            generateBreakpoint(`${key + (isVideoFile ? '-poster' : '')}-webp`, {
              file: fileData,
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

/**
 *  Applies a simple image transformation to see if the image is faulty/corrupted.
 */
const isFaultyImage = async (file) => {
  if (!file.filepath) {
    return new Promise((resolve, reject) => {
      const pipeline = sharp();
      pipeline.stats().then(resolve).catch(reject);
      file.getStream().pipe(pipeline);
    });
  }

  try {
    await sharp(file.filepath).stats();
    return false;
  } catch (e) {
    return true;
  }
};

const getFormat = async (file) => {
  try {
    return (await getMetadata(file)).format || file.ext.substring(1);
  } catch (e) {
    // throw when the file is not a supported image
    return null;
  }
};

const isOptimizableImage = async (file) => {
  const format = await getFormat(file);
  return format && FORMATS_TO_OPTIMIZE.includes(format);
};

const isResizableImage = async (file) => {
  let format;
  try {
    const metadata = await getMetadata(file);
    format = metadata.format;
  } catch (e) {
    // throw when the file is not a supported image
    return false;
  }
  return format && FORMATS_TO_RESIZE.includes(format);
};

const isImage = async (file) => {
  const format = await getFormat(file);
  return format && FORMATS_TO_PROCESS.includes(format);
};

const isOptimizableVideo = async (file) => {
  const format = await getFormat(file);
  return format && VIDEO_FORMATS_TO_OPTIMIZE.includes(format);
};

const isVideo = async (file) => {
  const format = await getFormat(file);
  return format && VIDEO_FORMATS_TO_PROCESS.includes(format);
};

const isAudio = async (file) => {
  const format = await getFormat(file);
  return format && AUDIO_FORMATS_TO_PROCESS.includes(format);
};

function formatSeconds(seconds) {
  // Get the whole seconds part and the milliseconds part separately
  const wholeSeconds = Math.floor(seconds);
  const milliseconds = Math.round((seconds - wholeSeconds) * 1000);

  // Calculate hours, minutes, and seconds
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainingSeconds = wholeSeconds % 60;

  // Format the string with leading zeros
  const hoursString = String(hours).padStart(2, '0');
  const minutesString = String(minutes).padStart(2, '0');
  const secondsString = String(remainingSeconds).padStart(2, '0');
  const millisecondsString = String(milliseconds).padStart(3, '0');

  // Concatenate and return the final string
  return `${hoursString}:${minutesString}:${secondsString}.${millisecondsString}`;
}

const generatePoster = async (file) => {
  if (!(await isVideo(file))) {
    return;
  }

  if (!file.filepath) {
    file.filepath = join(file.tmpWorkingDirectory, file.hash);
    await writeStreamToFile(file.getStream(), file.filepath);
  }

  const convertOptions = {
    streamEncoding: true,
    args: ['-ss', formatSeconds(file.posterTime || 0), '-vframes', '1', '-f', 'image2'],
    ext: '.png',
    name: 'png',
  };
  const newFileName = `${file.name.split('.').slice(0, -1).join('.') || file.name}${
    convertOptions.ext
  }`;
  const newFilePath = join(file.tmpWorkingDirectory, `poster_${file.hash}${convertOptions.ext}`);
  const newFileMime = `image/${convertOptions.name}`;
  const newFileExt = convertOptions.ext;

  if (!file.width || !file.height || !file.size) {
    const { width, height, size } = await getMetadata(file);
    file.width = width;
    file.height = height;
    file.size = size;
  }

  return new Promise((resolve, reject) => {
    console.log(
      'generatePoster started',
      file.filepath,
      `${file.width}x${file.height}`,
      newFilePath
    );
    convertVideo(
      file.filepath,
      `${file.width}x${file.height}`,
      newFilePath,
      convertOptions,
      (err) => {
        console.log('generatePoster finished');

        if (err) {
          console.log('generatePoster error', err);

          reject();
        } else {
          resolve();
        }
      }
    );
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
      const newFile = {
        name: newFileName,
        hash: file.hash,
        ext: newFileExt,
        mime: newFileMime,
        filepath: newFilePath,
        path: file.path || null,
        tmpWorkingDirectory: file.tmpWorkingDirectory,
        getStream: () => fs.createReadStream(newFilePath),
      };
      const { width, height, size, format } = await getMetadata(newFile);
      return optimize({ ...newFile, width, height, size, format });
    })
    .catch((e) => {
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
  return new Promise((resolveQ, rejectQ) => {
    q.push(() => fn().then(resolveQ).catch(rejectQ));
  });
}

function scale(width) {
  return `scale=${width}:-2`;
}

function convertVideo(input, size, output, options, callback) {
  queuePush(ffmpegQueue, () => {
    return new Promise((resolve) => {
      const outputTmpFile = typeof output === 'string';
      let ffm;

      try {
        ffm = ffmpeg(input).outputOptions(options.args);
        ffm.on('start', (commandLine) => {
          console.log(`Spawned Ffmpeg with command: ${commandLine}`);
        });
        let match;
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

      ffm.on('progress', (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
      });
      ffm.on('error', (error, stdout, stderr) => {
        error.stderr = stderr;
        callback(error);
        resolve();
      });

      if (outputTmpFile) {
        ffm.on('end', () => {
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
}

module.exports = () => ({
  isSupportedImage,
  isFaultyImage,
  isOptimizableImage,
  isOptimizableVideo,
  isResizableImage,
  isImage,
  isVideo,
  isAudio,
  getDimensions,
  generateResponsiveFormats,
  generateThumbnails,
  optimize,
});

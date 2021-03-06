import crypto from 'crypto';
import fs from 'fs';
import stream from 'stream';
import postcss from 'postcss';
import atImport from 'postcss-import';
import cssnano from 'cssnano';

const Readable = stream.Readable;

const hashRegex = /\[(hash)\]/;

const generateHashCode = sourceFileString => new Promise((resolve, reject) => {
  const hash = crypto.createHash('md5');
  const sourceStream = new Readable;
  sourceStream.push(sourceFileString);
  sourceStream.push(null);

  sourceStream.on('data', data => hash.update(data, 'utf8'));
  sourceStream.on('error', err => reject(err));
  sourceStream.on('end', () => resolve(hash.digest('hex')));
});

const cssqueeze = async ({ config }) => {
  try {
    const cssSource = fs.readFileSync(config.source, 'utf8');

    const result = await postcss()
      .use(atImport())
      .use(cssnano({
        preset: ['advanced', (config.plugins !== undefined ? config.plugins : {})]
      }))
      .process(cssSource, { from: config.source });

    const generateHash = hashRegex.test(config.destination);
    let hashCode;

    if (generateHash === true) hashCode = await generateHashCode(result.css);

    const destinationFileName = generateHash
      ? config.destination.replace(hashRegex, hashCode)
      : config.destination;

    const destinationFileStream = fs.createWriteStream(destinationFileName);
    destinationFileStream.write(result.css);
    destinationFileStream.end();

    return `\nsqueezed into -> ${destinationFileName}\n`;
  } catch (err) {
    throw err;
  }
};

export { cssqueeze as default };

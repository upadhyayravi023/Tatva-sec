'use strict';

const axios = require('axios');
const { PdfDownloadError } = require('../shared/errors');
const logger = require('../shared/logger');

function extractDriveFileId(driveLink) {
  const filePattern = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const openPattern = /[?&]id=([a-zA-Z0-9_-]+)/;

  const fileMatch = driveLink.match(filePattern);
  if (fileMatch) return fileMatch[1];

  const openMatch = driveLink.match(openPattern);
  if (openMatch) return openMatch[1];

  throw new PdfDownloadError(
    `Could not extract file ID from Google Drive link: ${driveLink}`
  );
}

function buildDirectDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
}

async function downloadPdfFromDrive(driveLink, jobId = 'unknown') {
  const log = (msg, meta = {}) =>
    logger.debug(msg, { feature: 'drive-downloader', jobId, ...meta });

  log('Extracting file ID from Drive link', { driveLink });
  const fileId = extractDriveFileId(driveLink);
  const downloadUrl = buildDirectDownloadUrl(fileId);
  log('Constructed direct download URL', { downloadUrl });

  try {
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      maxRedirects: 10,
      timeout: 60_000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TatvaBot/1.0)',
      },
    });

    const contentType = response.headers['content-type'] || '';

    if (contentType.includes('text/html')) {
      log('Drive returned HTML — parsing confirmation page for large file');
      const html = Buffer.from(response.data).toString('utf-8');
      const confirmedUrl = extractConfirmUrlFromHtml(html, fileId);

      log('Retrying with confirmed download URL');
      const confirmedResponse = await axios.get(confirmedUrl, {
        responseType: 'arraybuffer',
        maxRedirects: 10,
        timeout: 60_000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TatvaBot/1.0)',
        },
      });

      const buffer = Buffer.from(confirmedResponse.data);
      log('PDF downloaded successfully (confirmed)', { sizeBytes: buffer.length });
      return buffer;
    }

    const buffer = Buffer.from(response.data);
    log('PDF downloaded successfully', { sizeBytes: buffer.length });
    return buffer;
  } catch (err) {
    if (err instanceof PdfDownloadError) throw err;
    throw new PdfDownloadError(
      `Failed to download PDF from Drive: ${err.message}`,
      err
    );
  }
}

function extractConfirmUrlFromHtml(html, fileId) {
  const tokenMatch = html.match(/confirm=([0-9A-Za-z_\-]+)/);
  if (tokenMatch) {
    return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${tokenMatch[1]}`;
  }

  const hrefMatch = html.match(/href="(\/uc\?export=download[^"]+)"/);
  if (hrefMatch) {
    const decoded = hrefMatch[1].replace(/&amp;/g, '&');
    return `https://drive.google.com${decoded}`;
  }

  throw new PdfDownloadError(
    `Could not extract confirmation URL from Google Drive scan page (fileId: ${fileId})`
  );
}

module.exports = { downloadPdfFromDrive, extractDriveFileId };

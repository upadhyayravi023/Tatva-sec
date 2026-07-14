'use strict';

class PdfIndexingError extends Error {
  constructor(message, code, cause = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

class PdfDownloadError extends PdfIndexingError {
  constructor(message, cause = null) {
    super(message, 'PDF_DOWNLOAD_ERROR', cause);
  }
}

class PdfParseError extends PdfIndexingError {
  constructor(message, cause = null) {
    super(message, 'PDF_PARSE_ERROR', cause);
  }
}

class EmbeddingError extends PdfIndexingError {
  constructor(message, cause = null) {
    super(message, 'EMBEDDING_ERROR', cause);
  }
}

class VectorStoreError extends PdfIndexingError {
  constructor(message, cause = null) {
    super(message, 'VECTOR_STORE_ERROR', cause);
  }
}

class InvalidJobPayloadError extends PdfIndexingError {
  constructor(message) {
    super(message, 'INVALID_JOB_PAYLOAD');
  }
}

module.exports = {
  PdfIndexingError,
  PdfDownloadError,
  PdfParseError,
  EmbeddingError,
  VectorStoreError,
  InvalidJobPayloadError,
};

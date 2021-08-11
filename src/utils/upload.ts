import path from "path";
import fs from "fs";
import multer from "multer";
import { v1 as uuidv1 } from "uuid";
import { R } from "../R";
import { Response } from "express";

const fileSize = R.values.media.fileSizeLimits.MAX_FILE_SIZE;

/**
 * Checks if the file type is among the allowed
 * set of file types specified in the system.
 */
function checkFileType(file: any): boolean {
  return RegExp(
    Object.values(R.values.media.allowedMimeTypes)
      // @ts-ignore
      .map((value: R.values.media.allowedMimeTypes): string => value)
      .reduce((acc, value) => `${acc.toLowerCase()}|${value}`)
  ).test(file.mimetype);
}

/**
 * Gives the general type of the mime specified.
 */
function getStoragePath(mimetype: string): string {
  const { DOCUMENTS, IMAGES } = R.values.media.allowedPaths;
  const { JPEG, PNG, JPG } = R.values.media.allowedMimeTypes;
  let returnable: string;

  switch (mimetype) {
    case JPEG:
    case PNG:
    case JPG:
      returnable = IMAGES;
      break;
    default:
      returnable = DOCUMENTS;
  }

  return returnable;
}

/**
 * Handles the errors that arise during file upload.
 */
export async function handleUploadError(err: any) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") throw R.errors.MEDIA_TOO_LARGE;
    else if (err.code === "LIMIT_UNEXPECTED_FILE")
      throw R.errors.ALLOWED_SIMULTANEOUS_UPLOADS_EXCEEDED;
    else throw R.errors.UNKNOWN_EXPLAINABLE_ERROR(err.message);
  } else if (err) {
    if (err.message === "File type not supported.")
      throw R.errors.MEDIA_TYPE_NOT_SUPPORTED;
    else throw R.errors.UNKNOWN_EXPLAINABLE_ERROR(err.message);
  }
}

/**
 * Returns a multer object that is configured to the
 * options provided, or default configurations if
 * options are not provided.
 */
export function getUploadMiddleware({
  destination,
  filename,
  limits,
}: any = {}) {
  return multer({
    storage: multer.diskStorage({
      destination: !destination
        ? function (req, file, callback) {
            const destination = `${
              R.values.media.uploadsBaseDirectory
            }/${getStoragePath(file.mimetype).toLowerCase()}/`;

            if (!fs.existsSync(destination))
              fs.mkdirSync(destination, { recursive: true });

            callback(null, destination);
          }
        : destination,
      filename: !filename
        ? function (req, file, callback) {
            callback(null, `${uuidv1()}${path.extname(file.originalname)}`);
          }
        : filename,
    }),
    limits: !limits ? { fileSize } : limits,
    fileFilter: async function (req, file, callback) {
      const fileAllowed = checkFileType(file);

      if (fileAllowed) callback(null, true);
      else callback(R.errors.MEDIA_TYPE_NOT_SUPPORTED);
    },
  });
}

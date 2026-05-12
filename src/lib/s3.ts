import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const bucket = process.env.S3_BUCKET;

if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
  throw new Error(
    "Missing S3 env vars (S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET).",
  );
}

declare global {
  var __s3: S3Client | undefined;
}

export const s3 =
  global.__s3 ??
  new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

if (process.env.NODE_ENV !== "production") global.__s3 = s3;

export const S3_BUCKET = bucket;

export async function putObject(opts: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}) {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
    }),
  );
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

export async function signedDownloadUrl(opts: {
  key: string;
  filename: string;
  expiresInSeconds?: number;
}) {
  const cmd = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: opts.key,
    ResponseContentDisposition: `attachment; filename="${opts.filename.replace(/"/g, "")}"`,
  });
  return getSignedUrl(s3, cmd, {
    expiresIn: opts.expiresInSeconds ?? 60 * 10,
  });
}

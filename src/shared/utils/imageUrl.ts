const DEFAULT_BUCKET_URL = "https://bucket-shopcart.s3.us-east-1.amazonaws.com";

export function resolveImageUrl(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;

  const normalizedValue = value.trim();
  if (/^https?:\/\//i.test(normalizedValue)) return normalizedValue;

  const baseUrl = (import.meta.env.VITE_S3_PUBLIC_BASE_URL ?? DEFAULT_BUCKET_URL).replace(/\/$/, "");
  return `${baseUrl}/${normalizedValue.replace(/^\/+/, "")}`;
}

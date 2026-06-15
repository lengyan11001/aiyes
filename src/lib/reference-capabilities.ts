import { MODEL_META, type AllowedModel } from "@/lib/constants";

export type ReferenceKind = "image" | "video" | "audio";

export type ReferenceCapability = {
  image?: { max: number; required?: boolean };
  video?: { max: number };
  audio?: { max: number };
  firstLastFrame?: boolean;
  seed?: boolean;
};

const imageEditModels = new Set<AllowedModel>([
  "openai/gpt-image-2",
  "fal-ai/nano-banana-2",
  "fal-ai/nano-banana-pro",
]);

export function referenceCapabilitiesForModel(model: string): ReferenceCapability {
  const meta = MODEL_META[model as AllowedModel];
  if (!meta) return {};

  if (model === "seedance2") {
    return {
      image: { max: 9 },
      video: { max: 3 },
      audio: { max: 3 },
      firstLastFrame: true,
      seed: true,
    };
  }

  if (meta.kind === "VIDEO" && meta.taskType === "i2v") {
    return { image: { max: 1, required: true } };
  }

  if (meta.kind === "IMAGE" && imageEditModels.has(model as AllowedModel)) {
    return { image: { max: 1 } };
  }

  return {};
}

export function referenceLimit(capability: ReferenceCapability, kind: ReferenceKind) {
  return capability[kind]?.max ?? 0;
}

export function hasReferenceSupport(capability: ReferenceCapability) {
  return Boolean(capability.image || capability.video || capability.audio);
}

export function referenceAccept(capability: ReferenceCapability) {
  const values: string[] = [];
  if (capability.image) {
    values.push("image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp");
  }
  if (capability.video) {
    values.push("video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm", "video/x-flv");
  }
  if (capability.audio) {
    values.push("audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav");
  }
  return values.join(",");
}

export function referenceInputMeta(capability: ReferenceCapability) {
  if (!hasReferenceSupport(capability)) return undefined;
  return {
    ...(capability.firstLastFrame
      ? {
          functionMode: { type: "string", values: ["omini", "first_last_frame"], default: "omini" },
          end_image_url: { type: "url", description: "首尾帧模式下的尾帧图片 URL，需搭配 image_url。" },
        }
      : {}),
    ...(capability.image
      ? {
          image_url: {
            type: "url",
            required: Boolean(capability.image.required),
            description: capability.firstLastFrame ? "首尾帧模式下的首帧图片 URL；也可作为单张参考图使用。" : "参考图片 URL。",
          },
          ...(capability.image.max > 1
            ? {
                image_files: {
                  type: "array<url>",
                  maxItems: capability.image.max,
                  formats: ["png", "jpg", "jpeg", "gif", "bmp", "webp"],
                },
              }
            : {}),
        }
      : {}),
    ...(capability.video
      ? {
          video_url: { type: "url", description: "单个参考视频 URL。" },
          video_files: {
            type: "array<url>",
            maxItems: capability.video.max,
            formats: ["mp4", "mov", "avi", "mkv", "webm", "flv"],
          },
        }
      : {}),
    ...(capability.audio
      ? {
          audio_files: {
            type: "array<url>",
            maxItems: capability.audio.max,
            formats: ["mp3", "wav"],
            note: "需搭配图片或视频使用。",
          },
        }
      : {}),
    ...(capability.seed ? { seed: { type: "integer", required: false } } : {}),
  };
}

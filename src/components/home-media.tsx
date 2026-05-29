"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type HeroPreviewVideoProps = {
  src: string;
  poster: string;
  label: string;
  compact?: boolean;
};

export function HeroPreviewVideo({ src, poster, label, compact = false }: HeroPreviewVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  async function play() {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.muted = true;
      await video.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  function pause() {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setPlaying(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void play();
    }, 150);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={() => {
          setReady(true);
          void play();
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
      <button
        type="button"
        onClick={() => (playing ? pause() : void play())}
        className={`absolute left-4 inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/55 text-white backdrop-blur hover:bg-black/70 ${
          compact ? "bottom-3 px-3 py-1.5 text-xs" : "bottom-4 px-3 py-2 text-sm"
        }`}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
        {playing ? "播放中" : label}
      </button>
      <span
        className={`absolute right-3 top-3 rounded-md border px-2 py-1 text-xs backdrop-blur ${
          ready ? "border-emerald-300/20 bg-emerald-300/12 text-emerald-100" : "border-white/15 bg-black/40 text-white"
        }`}
      >
        {ready ? "ready" : "loading"}
      </span>
    </div>
  );
}

export type CaseStudy = {
  title: string;
  tag: string;
  media: "video" | "image";
  src: string;
  poster?: string;
  desc: string;
};

export function HoverVideoCard({ item }: { item: CaseStudy }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(item.media === "image");

  async function play() {
    if (item.media !== "video") return;
    const video = videoRef.current;
    if (!video) return;
    try {
      video.muted = true;
      await video.play();
      setPaused(false);
    } catch {
      setPaused(true);
    }
  }

  function pause() {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
    setPaused(true);
  }

  function toggle() {
    if (item.media !== "video") return;
    if (paused) void play();
    else pause();
  }

  return (
    <article
      className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-xl shadow-black/20"
      onMouseEnter={() => void play()}
      onFocus={() => void play()}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
        {item.media === "video" ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.poster}
              alt={item.title}
              className={`absolute inset-0 h-full w-full object-cover transition duration-300 ${
                ready ? "opacity-0" : "opacity-100"
              }`}
              loading="lazy"
            />
            <video
              ref={videoRef}
              src={item.src}
              poster={item.poster}
              muted
              loop
              playsInline
              autoPlay
              preload="auto"
              onCanPlay={() => {
                setReady(true);
                if (!paused) void play();
              }}
              onPlaying={() => {
                setReady(true);
                setPaused(false);
              }}
              onPlay={() => setPaused(false)}
              onPause={() => setPaused(true)}
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <button
              type="button"
              onClick={toggle}
              className="absolute inset-0 flex items-center justify-center"
              aria-label={`${paused ? "播放" : "暂停"}${item.title}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-lg backdrop-blur transition group-hover:scale-105">
                {paused ? <Play className="ml-0.5 h-5 w-5 fill-white" /> : <Pause className="h-5 w-5" />}
              </span>
            </button>
            <div className="absolute bottom-3 right-3 rounded-md border border-white/15 bg-black/45 px-2 py-1 text-xs text-white backdrop-blur">
              {ready ? (paused ? "已暂停" : "播放中") : "加载中"}
            </div>
          </>
        ) : (
          <Image
            src={item.src}
            alt={item.title}
            fill
            unoptimized
            sizes="(min-width: 1024px) 300px, 90vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/5 to-transparent pointer-events-none" />
        <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/45 px-2.5 py-1 text-xs text-white backdrop-blur">
          {item.tag}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold">{item.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">{item.desc}</p>
      </div>
    </article>
  );
}

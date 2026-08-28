"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Player() {
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid');

  if (!uid) {
    return <div className="p-8 text-center text-red-600">Video UID not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink mb-4">Class Recording</h1>
      <div className="aspect-video w-full max-w-4xl mx-auto rounded-lg overflow-hidden border border-line bg-black relative flex items-center justify-center">
        {uid.startsWith('local_video_') ? (
          <video
            src={`${process.env.NEXT_PUBLIC_API_BASE || 'https://backend-pearl-seven-77.vercel.app/api/v1'}/../uploads/videos/${uid.replace('local_video_', '')}`}
            controls
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
            crossOrigin="use-credentials"
            className="w-full h-full object-contain"
          />
        ) : uid.startsWith('mock-cf-video') ? (
          <div className="text-center text-white flex flex-col items-center gap-4 p-8">
            <div className="text-6xl">▶️</div>
            <h2 className="text-xl font-bold">Local Development Mode</h2>
            <p className="text-sm text-gray-400 max-w-md">
              This is a simulated video player. You uploaded a video without Cloudflare Stream configured. 
              If you want local playback, make sure your backend is running.
            </p>
          </div>
        ) : (
          <iframe
            src={`https://customer-xxxxxxxxxxxx.cloudflarestream.com/${uid}/iframe`}
            style={{ border: "none", width: "100%", height: "100%" }}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen={true}
          ></iframe>
        )}
      </div>
      <p className="text-sm text-muted text-center">
        Powered by Cloudflare Stream. This video is securely embedded.
      </p>
    </div>
  );
}

export default function VideoPlayerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading player...</div>}>
      <Player />
    </Suspense>
  );
}

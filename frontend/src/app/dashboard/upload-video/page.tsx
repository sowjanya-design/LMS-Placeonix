"use client";

import React from "react";
import VideoUpload from "@/components/video/VideoUpload";

export default function UploadVideoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Upload Course Video</h1>
        <p className="text-sm text-muted">
          Videos are securely uploaded to Cloudflare Stream.
        </p>
      </div>

      <div className="bg-white rounded-[14px] border border-line p-6">
        <VideoUpload
          // Note: In a fully finished version, you would use a dropdown
          // to let the mentor select which course/lesson this is for.
          courseId="64b1f1c7d3f2e1a4c8a2b5e2"
          lessonId="64b1f1c7d3f2e1a4c8a2b5e3"
          onUploadComplete={(data) => {
            alert("Video uploaded successfully! UID: " + data.videoUID);
          }}
        />
      </div>
    </div>
  );
}

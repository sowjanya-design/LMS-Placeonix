"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { api } from '@/lib/api';

interface VideoUploadProps {
  courseId: string;
  lessonId: string;
  onUploadComplete?: (videoData: { videoUID: string }) => void;
}

export default function VideoUpload({ courseId, lessonId, onUploadComplete }: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      setMessage('Please provide a title and select a video file.');
      return;
    }

    setUploading(true);
    setMessage('Requesting secure upload URL...');
    setProgress(10);

    try {
      // 1. Get Direct Upload URL from our backend
      const uploadRes = await api.post<{ uploadUrl: string; uid: string }>(
        '/videos/direct-upload',
        { courseId, lessonId, title }
      );

      const { uploadUrl, uid } = uploadRes;
      
      setMessage('Uploading video directly to Cloudflare...');
      setProgress(30);

      // 2. Upload file directly to Cloudflare (or our mock endpoint)
      const formData = new FormData();
      formData.append('file', file);

      const { data: uploadResult } = await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 70) / progressEvent.total);
            setProgress(30 + percentCompleted);
          }
        },
      });

      // If the mock backend gave us a new local UID, use it. Otherwise use the original.
      const finalUid = uploadResult?.result?.uid || uid;
      
      setMessage('Finalizing upload...');
      
      // 3. Notify backend that upload finished
      await api.post<unknown>(
        '/videos/finalize',
        { uid: finalUid, duration: 0, thumbnail: '' }
      );

      setMessage('Video uploaded successfully!');
      setUploading(false);
      setProgress(100);
      setFile(null);
      setTitle('');

      if (onUploadComplete) {
        onUploadComplete({ videoUID: finalUid });
      }
      
    } catch (error: unknown) {
      let errorMessage = 'Upload failed';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error(error);
      setMessage(errorMessage);
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="p-6 border rounded-lg shadow-sm bg-white max-w-md mx-auto">
      <h3 className="text-xl font-semibold mb-4">Upload Lesson Video</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Video Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="E.g., Introduction to React"
          className="w-full px-3 py-2 border rounded-md"
          disabled={uploading}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Video</label>
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/x-m4v"
          onChange={handleFileChange}
          className="w-full px-3 py-2 border rounded-md"
          disabled={uploading}
        />
        <p className="text-xs text-gray-500 mt-1">Accepts MP4, MOV</p>
      </div>

      {uploading && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-center mt-2 text-gray-600">{progress}% - {message}</p>
        </div>
      )}

      {!uploading && message && (
        <p className={`text-sm mb-4 ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || !file || !title}
        className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? 'Uploading...' : 'Start Upload'}
      </button>
    </div>
  );
}

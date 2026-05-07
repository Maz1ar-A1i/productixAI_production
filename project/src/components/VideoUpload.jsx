import React from "react";

const VideoPlayer = () => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <video
        src="../../videos/intro_video.mp4"   // path relative to public folder
        controls
        className="w-full rounded-lg shadow-lg"
        style={{ maxHeight: "400px" }}
      >
        Your browser does not support the video tag.
      </video>

      <div className="mt-2 text-sm text-gray-300">
        <p>File: demo.mp4</p>
        <p>Location: /public/videos/</p>
      </div>
    </div>
  );
};

export default VideoPlayer;

export async function loadVideo(url: string) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const videoEl = document.createElement("video") as HTMLVideoElement;
    videoEl.muted = true;
    videoEl.crossOrigin = "anonymous";
    videoEl.preload = "metadata";
    videoEl.onloadedmetadata = () => {
      // 👇 关键一步 fabric v5.5.2里面读取的是video标签的宽高属性，因此这里强制设置一下
      videoEl.width = videoEl.videoWidth;
      videoEl.height = videoEl.videoHeight;

      console.log("[imageRepository]video metadata load success");
      resolve(videoEl);
    };
    videoEl.onerror = evt => {
      console.log("[imageRepository]video load error", evt);
      reject(evt);
    };

    videoEl.src = url;
  });
}

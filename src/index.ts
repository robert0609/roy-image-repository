/**
 * 连续帧图片仓库
 * 内部利用video视频格式存储
 */
import { loadVideo } from "@/utils/loadVideo";
import mitt, { type Handler } from "mitt";
import { s2us, us2s } from "./utils/date";

type ImageRepositoryEvents = {
  /**
   * 请求帧数据回调
   */
  ["requestFrame"]: {
    /**
     * 当前请求帧的时间戳，单位微秒
     */
    frameTimestampInMicroseconds: number;
    /**
     * 原生的事件对象
     */
    originalEvent: {
      now: DOMHighResTimeStamp;
      metadata: VideoFrameCallbackMetadata;
    };
  };
};

export class ImageRepository {
  private static _repositories: Record<string, Promise<ImageRepository>> = {};

  private _isInited = false;

  private _videoElement?: HTMLVideoElement;
  /**
   * 视频DOM元素，使用它来渲染画布
   */
  get videoElement() {
    if (!this._videoElement) {
      throw new Error(`image repository is not inited!`);
    }
    return this._videoElement;
  }

  private _requestVideoFrameCallbackId?: number;

  private _emitter = mitt<ImageRepositoryEvents>();

  private constructor(private readonly videoUrl: string) {}

  static getRepository(videoUrl: string) {
    const key = videoUrl.toLowerCase().trim();
    if (!this._repositories[key]) {
      this._repositories[key] = (async () => {
        const repo = new ImageRepository(key);
        await repo.init();
        return repo;
      })();
    }
    return this._repositories[key];
  }

  async init() {
    if (this._isInited) {
      return;
    }
    this._isInited = true;
    this._videoElement = await loadVideo(this.videoUrl);

    const callback: VideoFrameRequestCallback = (now, metadata) => {
      // mediaTime单位是秒，因此要转换为微秒
      this._emitter.emit("requestFrame", {
        frameTimestampInMicroseconds: s2us(metadata.mediaTime),
        originalEvent: { now, metadata },
      });
      // 触发下一次
      this._requestVideoFrameCallbackId =
        this._videoElement!.requestVideoFrameCallback(callback);
    };
    this._requestVideoFrameCallbackId =
      this._videoElement.requestVideoFrameCallback(callback);
  }

  uninit() {
    if (!this._isInited) {
      return;
    }
    this._isInited = false;
    if (!!this._requestVideoFrameCallbackId) {
      this._videoElement!.cancelVideoFrameCallback(
        this._requestVideoFrameCallbackId
      );
      this._requestVideoFrameCallbackId = undefined;
    }
    this._videoElement = undefined;
    this._emitter.all.clear();
  }

  /**
   * 根据传入的微秒时间戳，获取指定位置的帧图片
   * @param timstampInMicroseconds 微秒时间戳
   */
  async getImage(timstampInMicroseconds: number) {
    if (!this._videoElement) {
      throw new Error(`image repository is not inited!`);
    }
    // currentTime单位是秒，因此这里要将传入的微秒时间戳转换为秒
    this._videoElement.currentTime = us2s(timstampInMicroseconds);
  }

  /**
   * 开始播放连续帧图片
   */
  async play() {
    if (!this._videoElement) {
      throw new Error(`image repository is not inited!`);
    }
    return await this._videoElement.play();
  }

  /**
   * 停止播放
   */
  stop() {
    if (!this._videoElement) {
      throw new Error(`image repository is not inited!`);
    }
    this.pause();
    this._videoElement.currentTime = us2s(0);
  }

  /**
   * 暂停播放
   */
  pause() {
    if (!this._videoElement) {
      throw new Error(`image repository is not inited!`);
    }
    this._videoElement.pause();
  }

  on<T extends keyof ImageRepositoryEvents>(
    eventName: T,
    handler: Handler<ImageRepositoryEvents[T]>
  ) {
    this._emitter.on(eventName, handler);

    return {
      off: () => {
        this._emitter.off(eventName, handler);
      },
    };
  }
}

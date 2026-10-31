import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// 1280x720 讲解视频默认；渲染时可用 --scale / --x264-preset 调整

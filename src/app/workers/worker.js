console.log("worker working");

import("mp3-mediarecorder/worker")
  .then((mod) => {
    mod.initMp3MediaEncoder({ vmsgWasmUrl: "/vmsg.wasm" });
  })
  .catch((err) => [console.error(err)]);

const {
  isMainThread,
  parentPort,
  workerData,
  threadId,
  Worker,
} = require("worker_threads");

let request = require("request");
var http=require('https'); 
const got = require('got');

const MAX_SPIDER_COUNT = 200;

// 主进程
async function mainThread() {
  let spiderCountCurrent = 0;
  let spiderCountTotal = 0;
  let movieCount = 0;

  while (true) {
    console.log(
      `蜘蛛数量： ${spiderCountCurrent}  蜘蛛总量： ${spiderCountTotal}  已爬数量：${movieCount}`
    );

    try {
      if (spiderCountCurrent < MAX_SPIDER_COUNT) {
        // 开启一个蜘蛛
        const spider = new Worker(__filename, { workerData: movieCount });

        // 监听蜘蛛消息
        spider.on("message", async (msg) => {
          // spider获取一个movieId
          if (msg.option == "getId") {
            movieCount += 1;
            spider.postMessage({
              option: "getId",
              data: movieCount,
            });
          }
        });

        // 监听蜘蛛上线
        spider.on("online", () => {
          spiderCountCurrent += 1;
          spiderCountTotal += 1;
          console.log(`✔️ spider-${spider.threadId} 上线啦`);
        });

        // 监听蜘蛛下线
        spider.on("exit", (exitCode) => {
          spiderCountCurrent -= 1;
          console.log(`✖️ spider-${exitCode} 下线啦`);
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      await sleep(500);
    }
  }
}

// 子线程-蜘蛛
async function spiderThread() {
  let id = -1;

  // 设置监听函数
  parentPort.on("message", (msg) => {
    // 获取movieId
    if (msg.option == "getId" && msg.data) {
      id = msg.data;
      console.log(`spider-${threadId} 获取Id:${id}`);
    }
  });

  // 循环爬取
  while (true) {
    console.log(`while循环里 spider-${threadId} id:${id}`);
    try {
      if (id>0) {
        // 实际request请求

        const response = await got('https://github.com/aininot260/spider-tools');
        console.log(response.body);

      }
    } catch (error) {
      console.log(`catch里 spider-${threadId} id:${id}`);
      console.log(`✖️ spider-${threadId} 即将下线 ${error.message}`);
      parentPort.postMessage({ option: "returnId", data: id });
      break;
    }
    console.log(`catch外 spider-${threadId} id:${id}`);
    parentPort.postMessage({ option: "getId" });
    await sleep(2000);
  }

  await sleep(2000);
  process.exit(threadId);
}

// 睡眠
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (isMainThread) {
  mainThread();
} else {
  spiderThread();
}

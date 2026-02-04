/**
 * 奖品设置
 * type: 唯一标识，0是默认特别奖的占位符，其它奖品不可使用
 * count: 奖品数量
 * title: 奖品描述
 * text: 奖品标题
 * img: 图片地址
 */
const prizes = [
  {
    type: 0,
    count: 1000,
    title: "",
    text: "Special Prize"
  },
  {
    type: 1,
    count: 2,
    text: "Grand Prize",
    title: "Mystery Jackpot",
    img: "../img/secrit.jpg"
  },
  {
    type: 2,
    count: 5,
    text: "First Prize",
    title: "Mac Pro",
    img: "../img/mbp.jpg"
  },
  {
    type: 3,
    count: 6,
    text: "Second Prize",
    title: "Huawei Mate30",
    img: "../img/huawei.png"
  },
  {
    type: 4,
    count: 7,
    text: "Third Prize",
    title: "iPad Mini 5",
    img: "../img/ipad.jpg"
  },
  {
    type: 5,
    count: 8,
    text: "Fourth Prize",
    title: "DJI Spark Drone",
    img: "../img/spark.jpg"
  },
  {
    type: 6,
    count: 8,
    text: "Fifth Prize",
    title: "Kindle",
    img: "../img/kindle.jpg"
  },
  {
    type: 7,
    count: 11,
    text: "Sixth Prize",
    title: "Edifier Bluetooth Earbuds",
    img: "../img/edifier.jpg"
  }
];

/**
 * 一次抽取的奖品个数与prizes对应
 */
const EACH_COUNT = [1, 1, 5, 6, 7, 8, 9, 10];

/**
 * 卡片公司名称标识
 */
const COMPANY = "UTEC";

module.exports = {
  prizes,
  EACH_COUNT,
  COMPANY
};

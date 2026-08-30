const { runAutoCheckout } = require("./checkoutWorker");


const startWorkers = () => {
  console.log("Workers started.");

  runAutoCheckout();

  setInterval(runAutoCheckout, 60 * 1000);
};

module.exports = {
  startWorkers,
};

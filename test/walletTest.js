const walletService = require("../services/walletService");

async function test() {
  try {
    // const result = await walletService.creditWallet({
    //   userId: "de9f78e5-9a5f-4526-8857-ae827ad98d24",
    //   amount: "5000.00",
    //   type: "CASH_FUNDING",
    //   reference: `TEST-${Date.now()}`,
    //   description: "Wallet credit test",
    //   });
      
      const result =await walletService.debitWallet({
        userId: "de9f78e5-9a5f-4526-8857-ae827ad98d24",
        amount: "5000.00",
        type: "BOOKING_DEBIT",
        reference: `TEST-DEBIT-${Date.now()}`,
        description: "Wallet debit test",
      });

    console.log("Credit successful:");
    console.log(result);
  } catch (error) {
    console.error("Credit failed:", error.message);
  }
}

test();

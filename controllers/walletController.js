const walletService = require("../services/walletService")

const getWallet = async (req, res, next) => {
    try {
        const wallet = await walletService.getWallet(req.user.id);

        return res.status(200).json({
            success: true,
            message: "Wallet data retrieved successfully.",
            data: {
                wallet,
            },
        });
    } catch (error) {
        next(error);
    }
};  

//-------------------------------------------------------------------------------------------

const getTransactions = async (req, res, next) => {
  try {
    const transactions = await walletService.getTransactions(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Wallet transactions retrieved successfully.",
      data: {
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
    getWallet,
    getTransactions,
};
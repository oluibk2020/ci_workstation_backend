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


// NEW — Admin-facing log of every cash-funding credit issued. See
// services/walletService.js's getCashFundingHistory header.
const getCashFundingHistory = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await walletService.getCashFundingHistory({ page, limit });

    return res.status(200).json({
      success: true,
      message: "Cash-funding history retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
    getWallet,
    getTransactions,
    getCashFundingHistory,
};
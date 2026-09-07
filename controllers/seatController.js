const seatService = require("../services/seatService");

const createSeat = async (req, res, next) => {
  try {
    const seat = await seatService.createSeat({
      workstationId: req.params.workstationId,
      seatId: req.body.seatId,
    });

    return res.status(201).json({
      success: true,
      message: "Seat created successfully.",
      data: {
        seat,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSeatsByWorkstation = async (req, res, next) => {
  try {
    const seats = await seatService.getSeatsByWorkstation(
      req.params.workstationId,
    );

    return res.status(200).json({
      success: true,
      message: "Seats retrieved successfully.",
      data: {
        seats,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSeatById = async (req, res, next) => {
  try {
    const seat = await seatService.getSeatById(req.params.seatId);

    return res.status(200).json({
      success: true,
      message: "Seat retrieved successfully.",
      data: {
        seat,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateSeat = async (req, res, next) => {
  try {
    const seat = await seatService.updateSeat(req.params.seatId, req.body);

    return res.status(200).json({
      success: true,
      message: "Seat updated successfully.",
      data: {
        seat,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateSeatStatus = async (req, res, next) => {
  try {
    const seat = await seatService.updateSeatStatus(
      req.params.seatId,
      req.body.status,
    );

    return res.status(200).json({
      success: true,
      message: "Seat status updated successfully.",
      data: {
        seat,
      },
    });
  } catch (error) {
    next(error);
  }
};

// NEW — Admin-only, returns ALL statuses. See services/seatService.js's
// getAllSeatsByWorkstationAdmin header.
const getAllSeatsByWorkstationAdmin = async (req, res, next) => {
  try {
    const seats = await seatService.getAllSeatsByWorkstationAdmin(req.params.workstationId);

    return res.status(200).json({
      success: true,
      message: "Seats retrieved successfully.",
      data: { seats },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSeat,
  getSeatsByWorkstation,
  getAllSeatsByWorkstationAdmin,
  getSeatById,
  updateSeat,
  updateSeatStatus,
};

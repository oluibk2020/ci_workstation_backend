const validate = (req, res, next) => {
    const {name, address, timezone, openingTime, closingTime, operatingDays} = req.body;

    if (!name || !address || !timezone || !openingTime || !closingTime || !operatingDays) {
        return res.status(400).json({
            success: false,
            message: "all fields are required.",
        });
    }

    if (
        typeof name !== "string" ||
        typeof address !== "string" ||
        typeof timezone !== "string" 
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid input.",
        });
    }
    if (typeof operatingDays !== "object" || Array.isArray(operatingDays)) {
        return res.status(400).json({
            success: false,
            message: "Invalid input.",
        });
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if(!timeRegex.test(openingTime) || !timeRegex.test(closingTime)) {
        return res.status(400).json({
            success: false,
            message: "Invalid input. Opening and closing time should be in HH:MM format.",
        });
    }

    if (openingTime > closingTime) {
        return res.status(400).json({
            success: false,
            message: "Opening time cannot be greater than closing time.",
        });
    }

    next();
 }

module.exports = { validate };